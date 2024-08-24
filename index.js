const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const express = require('express');


const readConfig = () => {
  const configPath = path.join(process.cwd(), 'devboy.config.js');
  if (fs.existsSync(configPath)) {
    return require(configPath);
  }
  return { api: { handler: 'index.js', routes: [] } };
};

const writeConfig = (config) => {
  const configPath = path.join(process.cwd(), 'devboy.config.js');
  fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(config, null, 2)};`);
};

const newRoute = async () => {
  const config = readConfig();
  let continueCreating = true;

  while (continueCreating) {
    const routeAnswers = await inquirer.prompt([
      { 
        name: 'path', 
        message: 'Enter the route path (e.g., /users/get_profile):',
        validate: (input) => {
          if (input.trim() === '') {
            return 'Route path cannot be empty. Please enter a valid path.';
          }
          if (!input.startsWith('/')) {
            return 'Route path must start with a "/". Please enter a valid path.';
          }
          return true;
        }
      },
      { name: 'method', type: 'list', message: 'Select the HTTP method:', choices: ['GET', 'POST', 'PUT', 'DELETE'] }
    ]);

    // Check for route duplication
    const isDuplicate = Object.values(config).some(lambda => 
      lambda.routes.some(route => route.path === routeAnswers.path && route.method === routeAnswers.method)
    );

    if (isDuplicate) {
      console.log(chalk.red(`Route ${routeAnswers.path} with method ${routeAnswers.method} already exists.`));
      const { retry } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'retry',
          message: 'Do you want to enter a different route?',
          default: true
        }
      ]);
      if (!retry) {
        continueCreating = false;
        continue;
      }
      continue;
    }

    // Generate list of existing Lambdas
    const existingLambdas = Object.keys(config).filter(key => key !== 'api');
    const lambdaChoices = [
      { name: 'Default function', value: 'api' },
      ...existingLambdas.map(name => ({ name: `Existing function: ${name}`, value: name })),
      { name: 'Create a new function', value: 'new' }
    ];

    const lambdaAnswer = await inquirer.prompt([
      { 
        name: 'lambda', 
        type: 'list',
        message: 'Which function should handle this route?',
        choices: lambdaChoices,
        default: 'api'
      }
    ]);

    let lambdaName = lambdaAnswer.lambda;
    if (lambdaName === 'new') {
      const newLambdaAnswer = await inquirer.prompt([
        { 
          name: 'name', 
          message: 'Enter a name for the new function:',
          validate: (input) => {
            if (input.trim() === '') {
              return 'Function name cannot be empty. Please enter a valid name.';
            }
            if (config[input.trim()]) {
              return 'A function with this name already exists. Please choose a different name.';
            }
            return true;
          }
        }
      ]);
      lambdaName = newLambdaAnswer.name;
    }

    const routePath = routeAnswers.path.slice(1); // Remove the leading '/'
    const handler = `api/${routePath}/${routeAnswers.method.toLowerCase()}/index.js`;
    const fullPath = path.join(process.cwd(), handler);

    // Create route files and update config
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, `
module.exports = async (event, context) => {
  // Implementation for ${routePath}
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello from ${routePath}!' })
  };
};
`);

    if (!config[lambdaName]) {
      config[lambdaName] = { handler: `${lambdaName}.js`, routes: [] };
    }
    config[lambdaName].routes.push({ path: routeAnswers.path, method: routeAnswers.method, handler });

    writeConfig(config);
    console.log(chalk.green(`Route ${routeAnswers.path} created successfully and added to ${lambdaName} function.`));

    if (lambdaName !== 'api') {
      console.log(chalk.yellow(`Don't forget to create ${lambdaName}.js in your project root as an entry point for this new function.`));
    }

    const { createAnother } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'createAnother',
        message: 'Do you want to create another route?',
        default: false
      }
    ]);

    continueCreating = createAnother;
  }
};


const start = () => {
  console.log(chalk.yellow('Starting Devboy development server...'));
  
  const app = express();
  const port = process.env.PORT || 3000;

  const config = readConfig();

  app.use(express.json());

  // Set up routes based on the config
  config.api.routes.forEach(route => {
    const handler = require(path.join(process.cwd(), route.handler));
    app[route.method.toLowerCase()](route.path, async (req, res) => {
      try {
        const result = await handler(req, res);
        res.json(result);
      } catch (error) {
        console.error(`Error in route ${route.path}:`, error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
  });

  // Catch-all route for undefined routes
  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  app.listen(port, () => {
    console.log(chalk.green(`Devboy development server is running on http://localhost:${port}`));
    console.log(chalk.blue('Available routes:'));
    config.api.routes.forEach(route => {
      console.log(chalk.gray(`  ${route.method} ${route.path}`));
    });
  });
};

const deploy = () => {
  const config = readConfig();
  
  // Validate configuration
  const errors = [];
  config.api.routes.forEach(route => {
    if (!fs.existsSync(path.join(process.cwd(), route.handler))) {
      errors.push(`Handler not found for route: ${route.path} (${route.method})`);
    }
  });

  if (errors.length > 0) {
    console.log(chalk.red('Deployment failed. Please fix the following errors:'));
    errors.forEach(error => console.log(chalk.red(`- ${error}`)));
    return;
  }

  console.log(chalk.yellow('Deploying Devboy application...'));
  console.log(chalk.blue('Deploying API'));
  console.log(chalk.gray('Routes:'));
  config.api.routes.forEach(route => {
    console.log(chalk.gray(`  ${route.method} ${route.path} -> ${route.handler}`));
  });
  // Add your AWS Lambda and API Gateway deployment logic here
  console.log(chalk.green('Deployment completed successfully!'));
};

module.exports = { newRoute, start, deploy };