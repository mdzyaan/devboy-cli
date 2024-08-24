#!/usr/bin/env node

const { program } = require('commander');
const { newRoute, start, deploy } = require('../index');

program
  .version('1.0.0')
  .description('Devboy CLI for managing serverless API projects');

program
  .command('new:route')
  .description('Create a new API route')
  .action(newRoute);

program
  .command('start')
  .description('Start the Devboy development server')
  .action(start);

program
  .command('deploy')
  .description('Deploy the Devboy application')
  .action(deploy);

program.parse(process.argv);