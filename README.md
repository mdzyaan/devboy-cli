# devboy-cli

devboy-cli is a powerful CLI tool for creating and managing serverless API projects. It simplifies the process of setting up and developing serverless applications.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
  - [Creating a New Project](#creating-a-new-project)
  - [Adding a New Route](#adding-a-new-route)
  - [Starting the Development Server](#starting-the-development-server)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Installation

You can install devboy-cli globally using npm:

```bash
npm install -g devboy-cli
```

## Quick Start

To create a new project:

```bash
npx create-devboy-app my-project
cd my-project
npm start
```

## Usage

### Creating a New Project

To create a new Devboy project, use the `create-devboy-app` command:

```bash
npx create-devboy-app my-project
```

This will set up a new project with the basic structure and configuration.

### Adding a New Route

To add a new route to your project:

```bash
devboy new:route
```

Follow the prompts to specify the route path, HTTP method, and function to handle the route.

### Starting the Development Server

To start the development server:

```bash
npm start
```

or

```bash
devboy start
```

This will start a local development server, typically on http://localhost:3000.

## Configuration

Devboy uses a `devboy.config.js` file in the root of your project for configuration. Here's an example:

```javascript
module.exports = {
  api: {
    handler: 'index.js',
    routes: [
      { path: '/users', method: 'GET', handler: 'api/users/get/index.js' },
      // Add more routes here
    ]
  }
};
```

## Project Structure

A typical Devboy project structure looks like this:

```
my-project/
├── api/
│   └── [route-folders]/
│       └── [method]/
│           └── index.js
├── models/
├── index.js
├── devboy.config.js
└── package.json
```

## Contributing

We welcome contributions to devboy-cli! Please see our [Contributing Guide](CONTRIBUTING.md) for more details.

## License

devboy-cli is [MIT licensed](LICENSE).