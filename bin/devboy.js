#!/usr/bin/env node

const { program } = require('commander');
const { newRoute, start, deploy, doctor, studio, newJob, applyIntegrations, showCatalog } = require('../index');

program
  .name('devboy')
  .version('2.0.0')
  .description('Devboy CLI — backend APIs with pluggable auth, db, cron, and cloud compute')
  .action(() => {
    program.help();
  });

program
  .command('start')
  .description('Start the local Devboy API server (Lambda-compatible events)')
  .action(start);

program
  .command('studio')
  .description('Open the local Next.js config Studio (never deployed)')
  .action(studio);

program
  .command('deploy')
  .description('Deploy the API to the configured compute provider (AWS v1)')
  .action(deploy);

program
  .command('doctor')
  .description('Check compute credentials and integration env vars')
  .action(doctor);

program
  .command('new:route')
  .description('Create a new API route handler')
  .action(newRoute);

program
  .command('new:job')
  .description('Create a scheduled job route')
  .action(newJob);

program
  .command('apply')
  .description('Scaffold selected auth/db/cron integrations into the project')
  .option('--auth <id>', 'auth provider id')
  .option('--db <id>', 'db provider id')
  .option('--cron <id>', 'cron provider id')
  .option('--compute <id>', 'compute provider id')
  .option('--region <region>', 'compute region')
  .option('--skip-install', 'skip npm install')
  .action((opts) =>
    applyIntegrations({
      auth: opts.auth,
      db: opts.db,
      cron: opts.cron,
      compute: opts.compute,
      region: opts.region,
      skipInstall: opts.skipInstall,
    })
  );

program
  .command('catalog')
  .description('Print the bundled integrations catalog (offline)')
  .action(showCatalog);

program.parse(process.argv);
