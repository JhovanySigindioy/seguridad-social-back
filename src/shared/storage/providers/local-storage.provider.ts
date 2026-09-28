import { createReadStream, existsSync, mkdirSync, promises as fsPromises, statSync } from 'fs';
import { dirname, resolve } from 'path';
import type { StorageDownloadObject, StorageHeadObjectResult, StorageProvider, StorageUploadInput } from '../storage.types.js';

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly rootDir: string) {}

  async putObject(input: StorageUploadInput): Promise<void> {
    const filePath = this.resolveKey(input.key);
    mkdirSync(dirname(filePath), { recursive: true });
    await fsPromises.writeFile(filePath, input.body);
  }

  async deleteObject(key: string): Promise<void> {
    await fsPromises.rm(this.resolveKey(key), { force: true });
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const filePath = this.resolveKey(key);

    if (!existsSync(filePath)) {
      throw Object.assign(new Error('Archivo no encontrado en el storage local.'), { status: 404 });
    }

    return fsPromises.readFile(filePath);
  }

  async getObjectStream(key: string): Promise<StorageDownloadObject> {
    const filePath = this.resolveKey(key);

    if (!existsSync(filePath)) {
      throw Object.assign(new Error('Archivo no encontrado en el storage local.'), { status: 404 });
    }

    const stats = statSync(filePath);

    return {
      body: createReadStream(filePath),
      contentLength: stats.size,
      lastModified: stats.mtime,
    };
  }

  async headObject(key: string): Promise<StorageHeadObjectResult> {
    const filePath = this.resolveKey(key);

    if (!existsSync(filePath)) {
      return { exists: false };
    }

    const stats = statSync(filePath);

    return {
      exists: true,
      contentLength: stats.size,
      lastModified: stats.mtime,
    };
  }

  private resolveKey(key: string): string {
    return resolve(this.rootDir, ...key.split('/'));
  }
}
