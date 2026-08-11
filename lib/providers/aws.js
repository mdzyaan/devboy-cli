const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const archiver = require('archiver');
const {
  LambdaClient,
  CreateFunctionCommand,
  UpdateFunctionCodeCommand,
  UpdateFunctionConfigurationCommand,
  GetFunctionCommand,
  AddPermissionCommand,
  waitUntilFunctionUpdated,
} = require('@aws-sdk/client-lambda');
const {
  ApiGatewayV2Client,
  CreateApiCommand,
  CreateIntegrationCommand,
  CreateRouteCommand,
  CreateStageCommand,
  GetApisCommand,
  GetRoutesCommand,
} = require('@aws-sdk/client-apigatewayv2');
const {
  IAMClient,
  CreateRoleCommand,
  AttachRolePolicyCommand,
  GetRoleCommand,
} = require('@aws-sdk/client-iam');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const { readConfig, allRoutes } = require('../config');
const { loadEnv, readEnvFile, pickEnv } = require('../env');
const { getAuthIntegration } = require('../integrations/auth');
const { getDbIntegration } = require('../integrations/db');
const { getCronIntegration } = require('../integrations/cron');

const id = 'aws';

function clients(region) {
  return {
    lambda: new LambdaClient({ region }),
    apigw: new ApiGatewayV2Client({ region }),
    iam: new IAMClient({ region }),
    sts: new STSClient({ region }),
  };
}

async function validateCredentials(region = 'us-east-1') {
  try {
    const { sts } = clients(region);
    const identity = await sts.send(new GetCallerIdentityCommand({}));
    return {
      ok: true,
      message: `AWS identity ${identity.Arn}`,
      account: identity.Account,
      arn: identity.Arn,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error.name === 'CredentialsProviderError' || /Could not load credentials/i.test(error.message)
          ? 'No AWS credentials. Create an account at https://aws.amazon.com/ then run `aws configure` or SSO login.'
          : error.message,
    };
  }
}

function collectDeployEnv(cwd, config) {
  loadEnv(cwd);
  const fileEnv = readEnvFile(cwd);
  const keys = new Set();
  const auth = getAuthIntegration(config.auth.provider);
  const db = getDbIntegration(config.db.provider);
  const cron = getCronIntegration(config.cron.provider);
  for (const k of (auth && auth.envKeys) || []) keys.add(k);
  for (const k of (db && db.envKeys) || []) keys.add(k);
  for (const k of (cron && cron.envKeys) || []) keys.add(k);
  return pickEnv([...keys], { ...fileEnv, ...process.env });
}

function writeLambdaShim(stagingDir) {
  const simple = `'use strict';
const app = require('./index.js');

function normalizeEvent(event) {
  if (event.httpMethod && event.path) return event;
  const method = event.requestContext && event.requestContext.http && event.requestContext.http.method;
  const p = event.rawPath || (event.requestContext && event.requestContext.http && event.requestContext.http.path);
  return {
    ...event,
    httpMethod: method || event.httpMethod,
    path: p || event.path,
  };
}

exports.handler = async (event, context) => {
  const normalized = normalizeEvent(event);
  if (typeof app.handler === 'function') return app.handler(normalized, context);
  if (typeof app === 'function') return app(normalized, context);
  throw new Error('index.js must export handler(event, context)');
};
`;
  fs.writeFileSync(path.join(stagingDir, 'lambda.js'), simple);
}

function zipDirectory(sourceDir) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('error', reject);
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function buildZip(cwd) {
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'devboy-deploy-'));
  const ignore = new Set(['.git', 'studio', '.env', '.env.local', 'devboy-state.json']);

  function copyTree(src, dest) {
    fs.ensureDirSync(dest);
    for (const entry of fs.readdirSync(src)) {
      if (ignore.has(entry)) continue;
      if (entry === 'node_modules') continue;
      const from = path.join(src, entry);
      const to = path.join(dest, entry);
      const stat = fs.statSync(from);
      if (stat.isDirectory()) copyTree(from, to);
      else fs.copyFileSync(from, to);
    }
  }

  copyTree(cwd, staging);
  writeLambdaShim(staging);

  if (fs.existsSync(path.join(cwd, 'node_modules'))) {
    await fs.copy(path.join(cwd, 'node_modules'), path.join(staging, 'node_modules'), {
      filter: (src) => !src.includes(`${path.sep}.cache${path.sep}`),
    });
  } else {
    execFileSync('npm', ['install', '--omit=dev'], { cwd: staging, stdio: 'inherit' });
  }

  const zipBuffer = await zipDirectory(staging);
  fs.removeSync(staging);
  return zipBuffer;
}

async function ensureRole(iam, roleName) {
  try {
    const existing = await iam.send(new GetRoleCommand({ RoleName: roleName }));
    return existing.Role.Arn;
  } catch {
    // create
  }
  const assume = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { Service: 'lambda.amazonaws.com' },
        Action: 'sts:AssumeRole',
      },
    ],
  };
  const created = await iam.send(
    new CreateRoleCommand({
      RoleName: roleName,
      AssumeRolePolicyDocument: JSON.stringify(assume),
      Description: 'Devboy Lambda execution role',
    })
  );
  await iam.send(
    new AttachRolePolicyCommand({
      RoleName: roleName,
      PolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
    })
  );
  // IAM propagation
  await new Promise((r) => setTimeout(r, 8000));
  return created.Role.Arn;
}

async function ensureHttpApi(apigw, name, lambdaArn, region, accountId) {
  const apis = await apigw.send(new GetApisCommand({}));
  let api = (apis.Items || []).find((a) => a.Name === name);
  if (!api) {
    api = await apigw.send(
      new CreateApiCommand({
        Name: name,
        ProtocolType: 'HTTP',
        CorsConfiguration: {
          AllowHeaders: ['*'],
          AllowMethods: ['*'],
          AllowOrigins: ['*'],
        },
      })
    );
  }

  const integration = await apigw.send(
    new CreateIntegrationCommand({
      ApiId: api.ApiId,
      IntegrationType: 'AWS_PROXY',
      IntegrationUri: lambdaArn,
      PayloadFormatVersion: '2.0',
    })
  );

  const routes = await apigw.send(new GetRoutesCommand({ ApiId: api.ApiId }));
  const hasProxy = (routes.Items || []).some((r) => r.RouteKey === 'ANY /{proxy+}');
  if (!hasProxy) {
    await apigw.send(
      new CreateRouteCommand({
        ApiId: api.ApiId,
        RouteKey: 'ANY /{proxy+}',
        Target: `integrations/${integration.IntegrationId}`,
      })
    );
  }
  const hasRoot = (routes.Items || []).some((r) => r.RouteKey === 'ANY /');
  if (!hasRoot) {
    await apigw.send(
      new CreateRouteCommand({
        ApiId: api.ApiId,
        RouteKey: 'ANY /',
        Target: `integrations/${integration.IntegrationId}`,
      })
    );
  }

  try {
    await apigw.send(
      new CreateStageCommand({
        ApiId: api.ApiId,
        StageName: '$default',
        AutoDeploy: true,
      })
    );
  } catch {
    // stage may exist
  }

  // permission for API GW to invoke lambda is set via lambda add-permission in deploy()
  const url = `https://${api.ApiId}.execute-api.${region}.amazonaws.com`;
  return { apiId: api.ApiId, url, accountId };
}

async function deploy(options = {}) {
  const cwd = options.cwd || process.cwd();
  const config = readConfig(cwd);
  const region = (options.region || config.compute.region || 'us-east-1');
  const projectName = path.basename(cwd).replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 40) || 'devboy-app';
  const functionName = config.compute.functionName || `devboy-${projectName}`;
  const apiName = config.compute.stackName || `devboy-${projectName}-http`;

  const creds = await validateCredentials(region);
  if (!creds.ok) {
    return { ok: false, error: creds.message };
  }

  const routes = allRoutes(config);
  for (const route of routes) {
    if (!fs.existsSync(path.join(cwd, route.handler))) {
      return { ok: false, error: `Handler missing: ${route.handler}` };
    }
  }

  const { lambda, apigw, iam } = clients(region);
  const roleName = `${functionName}-role`;
  const roleArn = await ensureRole(iam, roleName);
  const zip = await buildZip(cwd);
  const envVars = collectDeployEnv(cwd, config);

  let fnArn;
  try {
    await lambda.send(new GetFunctionCommand({ FunctionName: functionName }));
    await lambda.send(
      new UpdateFunctionCodeCommand({
        FunctionName: functionName,
        ZipFile: zip,
      })
    );
    await waitUntilFunctionUpdated({ client: lambda, maxWaitTime: 120 }, { FunctionName: functionName });
    await lambda.send(
      new UpdateFunctionConfigurationCommand({
        FunctionName: functionName,
        Runtime: 'nodejs20.x',
        Handler: 'lambda.handler',
        Timeout: 30,
        MemorySize: 256,
        Environment: { Variables: envVars },
      })
    );
    const updated = await lambda.send(new GetFunctionCommand({ FunctionName: functionName }));
    fnArn = updated.Configuration.FunctionArn;
  } catch (error) {
    if (error.name !== 'ResourceNotFoundException') {
      return { ok: false, error: error.message };
    }
    const created = await lambda.send(
      new CreateFunctionCommand({
        FunctionName: functionName,
        Runtime: 'nodejs20.x',
        Role: roleArn,
        Handler: 'lambda.handler',
        Code: { ZipFile: zip },
        Timeout: 30,
        MemorySize: 256,
        Environment: { Variables: envVars },
      })
    );
    fnArn = created.FunctionArn;
    await waitUntilFunctionUpdated({ client: lambda, maxWaitTime: 120 }, { FunctionName: functionName });
  }

  try {
    await lambda.send(
      new AddPermissionCommand({
        FunctionName: functionName,
        StatementId: `apigw-invoke-${Date.now()}`,
        Action: 'lambda:InvokeFunction',
        Principal: 'apigateway.amazonaws.com',
        SourceArn: `arn:aws:execute-api:${region}:${creds.account}:*`,
      })
    );
  } catch {
    // may already exist with different id — ignore
  }

  const http = await ensureHttpApi(apigw, apiName, fnArn, region, creds.account);

  const statePath = path.join(cwd, 'devboy-state.json');
  const state = {
    provider: 'aws',
    region,
    functionName,
    functionArn: fnArn,
    apiId: http.apiId,
    url: http.url,
    updatedAt: new Date().toISOString(),
  };
  fs.writeJsonSync(statePath, state, { spaces: 2 });

  return { ok: true, ...state, routes };
}

async function destroy(options = {}) {
  return {
    ok: false,
    error: 'destroy is not fully automated yet — delete the Lambda and HTTP API from the AWS console, or remove resources named in devboy-state.json',
  };
}

module.exports = {
  id,
  validateCredentials,
  deploy,
  destroy,
};
