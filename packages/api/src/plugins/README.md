# ElysiaJS Plugin System

This directory contains modular API plugins built with Elysia. Plugins are automatically discovered and loaded at runtime.

## Directory Structure

```
plugins/
└── plugin-name/
    ├── plugin-name.plugin.ts     // Main plugin entry point
    ├── plugin-name.routes.ts     // Route definitions
    ├── plugin-name.schema.ts     // Data schemas
    ├── plugin-name.types.ts      // TypeScript types
    └── plugin.config.json        // Configuration file
```

## Configuration (plugin.config.json)

```json
{
  "name": "plugin-name", // Required: Plugin name
  "version": "1.0.0", // Required: Plugin version
  "enabled": true, // Required: Enable/disable
  "dependencies": ["other-plugin"], // Optional: Dependencies
  "tag": {
    // Optional: API docs
    "name": "Display Name",
    "description": "API documentation description"
  },
  "metadata": {
    // Optional: Additional info
    "author": "Author Name",
    "license": "MIT",
    "respository": "https://github.com/a_github_user/a_repo",
    "description": "Plugin description",
    "homepage": "https://myhomepage.com",
    "keywords": ["my", "keywords"]
  }
}
```

## Plugin Implementation

```typescript
import { Elysia } from 'elysia';
import { routes } from './plugin-name.routes';
import { createPlugin } from '../../utils/plugin.util';

const plugin = createPlugin(new Elysia().use(routes));

export default plugin;
```

Major version numbers in plugin versions must match the API version to be loaded.
