import type { Readable } from 'stream';

export interface StorageUploadInput {
  key: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface StorageDownloadObject {
  body: Readable;
  contentType?: string;
  contentLength?: number;
  lastModified?: Date;
}

export interface StorageHeadObjectResult {
  exists: boolean;
  contentType?: string;
  contentLength?: number;
  lastModified?: Date;
}

export interface StorageProvider {
  putObject(input: StorageUploadInput): Promise<void>;
  deleteObject(key: string): Promise<void>;
  getObjectBuffer(key: string): Promise<Buffer>;
  getObjectStream(key: string): Promise<StorageDownloadObject>;
  headObject(key: string): Promise<StorageHeadObjectResult>;
}
