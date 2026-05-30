// env se importa primero para validar variables de entorno antes de arrancar
import { env } from './config/env.js';
import app from './app.js';
import logger from './shared/utils/logger.js';

app.listen(env.PORT, () => {
  logger.info(`Servidor escuchando en puerto ${env.PORT} [${env.NODE_ENV}]`);
});
