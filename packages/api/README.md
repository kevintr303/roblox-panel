# Roblox Panel API

A modular REST API built with ElysiaJS and Bun.

## Features

- **Plugin System**: Modular architecture for extending API functionality
- **Standardized Responses**: Consistent response format for all endpoints
- **API Versioning**: Versioning support via plugin system
- **Swagger Documentation**: Auto-generated API documentation

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (version 1.0.0 or later)

### Installation

```bash
# Install dependencies
bun install
```

### Development

```bash
# Start development server
bun dev
```

The development server will start on http://localhost:3000 by default.

### Environment Variables

Configure the API by creating a `.env` file in the root directory:

```
# API Configuration
API_PORT=3000
API_VERSION=1
NODE_ENV=development

# Swagger Configuration
SWAGGER_TITLE=Roblox Panel API
SWAGGER_PATH=/api/docs
```

## API Endpoints

- `GET /api`: API information
- `GET /api/health`: Health check endpoint
- `GET /api/docs`: Swagger documentation

## Plugin System

See the [plugin documentation](./src/plugins/README.md) for details on how to create and use plugins.

## Building and Deployment

```bash
# Build for production
bun run build

# Start production server
bun run start
```
