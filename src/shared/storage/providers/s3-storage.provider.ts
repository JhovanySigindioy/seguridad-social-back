import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, NoSuchKey, PutObjectCommand, S3Client, S3ServiceException } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import type { StorageDownloadObject, StorageHeadObjectResult, StorageProvider, StorageUploadInput } from '../storage.types.js';

const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;

  constructor(
    private readonly bucket: string,
    config: {
      endpoint: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    }
  ) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async putObject(input: StorageUploadInput): Promise<void> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      Metadata: input.metadata,
    }));
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));

    if (!response.Body) {
      throw Object.assign(new Error('Archivo vacio o no encontrado en el bucket.'), { status: 404 });
    }

    return this.bodyToBuffer(response.Body);
  }

  async getObjectStream(key: string): Promise<StorageDownloadObject> {
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));

    if (!response.Body) {
      throw Object.assign(new Error('Archivo vacio o no encontrado en el bucket.'), { status: 404 });
    }

    const body = response.Body instanceof Readable
      ? response.Body
      : Readable.from(await this.bodyToBuffer(response.Body));

    return {
      body,
      ...(response.ContentType ? { contentType: response.ContentType } : {}),
      ...(typeof response.ContentLength === 'number' ? { contentLength: response.ContentLength } : {}),
      ...(response.LastModified ? { lastModified: response.LastModified } : {}),
    };
  }

  async headObject(key: string): Promise<StorageHeadObjectResult> {
    try {
      const response = await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));

      return {
        exists: true,
        ...(response.ContentType ? { contentType: response.ContentType } : {}),
        ...(typeof response.ContentLength === 'number' ? { contentLength: response.ContentLength } : {}),
        ...(response.LastModified ? { lastModified: response.LastModified } : {}),
      };
    } catch (error) {
      if (error instanceof NoSuchKey) {
        return { exists: false };
      }

      if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404) {
        return { exists: false };
      }

      throw error;
    }
  }

  private async bodyToBuffer(body: unknown): Promise<Buffer> {
    if (body instanceof Readable) {
      return streamToBuffer(body);
    }

    if (body && typeof body === 'object' && 'transformToByteArray' in body && typeof (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray === 'function') {
      return Buffer.from(await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray());
    }

    throw Object.assign(new Error('No fue posible leer el archivo en el bucket.'), { status: 500 });
  }
}
