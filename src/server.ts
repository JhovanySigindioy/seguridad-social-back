import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import logger from './shared/utils/logger.js';

const PORT = process.env.PORT || 3001;

app.listen(Number(PORT), '0.0.0.0', () => {
  logger.info(`🚀 Security Social v2 Backend running on: http://127.0.0.1:${PORT}`);
});
