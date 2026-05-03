import app from './app.js';
import logger from './shared/utils/logger.js';

const PORT = Number(process.env.PORT || 3001);

app.listen(PORT, () => {
  logger.info(`Servidor escuchando en puerto ${PORT}`);
});
