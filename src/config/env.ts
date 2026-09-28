import './load-env.js';

import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_HOST: z.string().min(1, 'DB_HOST es requerido'),
  DB_USER: z.string().min(1, 'DB_USER es requerido'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD es requerido'),
  DB_NAME: z.string().min(1, 'DB_NAME es requerido'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_ROOT: z.string().min(1).default('uploads'),
  STORAGE_S3_ENDPOINT: z.string().optional(),
  STORAGE_S3_REGION: z.string().default('auto'),
  STORAGE_S3_BUCKET: z.string().optional(),
  STORAGE_S3_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_S3_SECRET_ACCESS_KEY: z.string().optional(),
  MAX_DOCUMENT_SIZE_MB: z.coerce.number().positive().default(10),
}).superRefine((data, ctx) => {
  if (data.STORAGE_DRIVER !== 's3') {
    return;
  }

  const requiredFields = [
    ['STORAGE_S3_ENDPOINT', data.STORAGE_S3_ENDPOINT],
    ['STORAGE_S3_BUCKET', data.STORAGE_S3_BUCKET],
    ['STORAGE_S3_ACCESS_KEY_ID', data.STORAGE_S3_ACCESS_KEY_ID],
    ['STORAGE_S3_SECRET_ACCESS_KEY', data.STORAGE_S3_SECRET_ACCESS_KEY],
  ] as const;

  for (const [field, value] of requiredFields) {
    if (!value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `${field} es requerido cuando STORAGE_DRIVER=s3`,
      });
    }
  }
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas al iniciar el servidor:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;
