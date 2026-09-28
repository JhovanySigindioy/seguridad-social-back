import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const candidateFiles = [
  process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local',
  '.env',
];

for (const file of candidateFiles) {
  const envPath = resolve(process.cwd(), file);

  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
