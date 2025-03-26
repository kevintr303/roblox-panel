export const config = {
  api: {
    port: parseInt(process.env.API_PORT || '3000', 10),
    version: parseInt(process.env.API_VERSION || '1', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  swagger: {
    title: process.env.SWAGGER_TITLE || 'Roblox Panel API',
  },
  isDev: process.env.NODE_ENV !== 'production',
}; 