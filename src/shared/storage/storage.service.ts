import { resolve } from 'path';
import { env } from '../../config/env.js';
import logger from '../utils/logger.js';
import { LocalStorageProvider } from './providers/local-storage.provider.js';
import { S3StorageProvider } from './providers/s3-storage.provider.js';
import type { StorageProvider } from './storage.types.js';

let providerInstance: StorageProvider | null = null;

const createProvider = (): StorageProvider => {
  if (env.STORAGE_DRIVER === 's3') {
    const endpoint = env.STORAGE_S3_ENDPOINT!;
    const bucket = env.STORAGE_S3_BUCKET!;
    const accessKeyId = env.STORAGE_S3_ACCESS_KEY_ID!;
    const secretAccessKey = env.STORAGE_S3_SECRET_ACCESS_KEY!;

    logger.info('Inicializando storage S3-compatible', {
      endpoint,
      bucket,
    });

    return new S3StorageProvider(bucket, {
      endpoint,
      region: env.STORAGE_S3_REGION,
      accessKeyId,
      secretAccessKey,
    });
  }

  const rootDir = resolve(process.cwd(), env.STORAGE_LOCAL_ROOT);
  logger.info('Inicializando storage local', { rootDir });
  return new LocalStorageProvider(rootDir);
};

export const storageService = {
  get provider(): StorageProvider {
    if (!providerInstance) {
      providerInstance = createProvider();
    }

    return providerInstance;
  },
};
