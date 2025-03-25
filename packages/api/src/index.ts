import { Elysia } from 'elysia';
import { node } from '@elysiajs/node';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { loadPlugins } from './utils/plugin.util';
import { errorHandler } from './utils/validation.util';

const CURRENT_API_VERSION = 1;

const app = new Elysia({ adapter: node() }).use(cors());

const swaggerConfig = {
  documentation: {
    info: {
      title: 'Roblox Panel API',
      version: `${CURRENT_API_VERSION}`,
    },
    tags: [] as Array<{ name: string; description: string }>,
  },
  path: '/api/docs',
};

app.use(swagger(swaggerConfig));

app.use(errorHandler);

app.get('/api', () => {
  return {
    message: 'Roblox Panel API',
    version: `${CURRENT_API_VERSION}`,
  };
});

const { tags } = await loadPlugins(app, CURRENT_API_VERSION);

swaggerConfig.documentation.tags = tags;

app.listen(3000);
