import { Elysia } from 'elysia';
import { node } from '@elysiajs/node';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { loadPlugins } from './utils/plugin.util';
import { errorHandler } from './utils/validation.util';
import { config } from './utils/config.util';
import { healthCheck } from './utils/health.util';

const app = new Elysia({ adapter: node() }).use(cors());

const swaggerConfig = {
  documentation: {
    info: {
      title: config.swagger.title,
      version: `${config.api.version}`,
    },
    tags: [] as Array<{ name: string; description: string }>,
  },
  path: '/api/docs',
};

app.use(swagger(swaggerConfig));

app.use(errorHandler);

app.get('/api', () => {
  return {
    message: config.swagger.title,
    version: `${config.api.version}`,
  };
});

app.use(healthCheck);

const { tags } = await loadPlugins(app, config.api.version);

swaggerConfig.documentation.tags = tags;

app.listen(config.api.port);
