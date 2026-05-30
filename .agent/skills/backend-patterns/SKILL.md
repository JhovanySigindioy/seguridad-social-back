---
name: backend-patterns
description: "Úsala cuando necesites escribir una operación que toque múltiples tablas (transacciones), implementar paginación en un servicio, validar variables de entorno, usar utilidades compartidas de `src/shared/`, o cuando necesites seguir la convención de nomenclatura de archivos del proyecto."
---

# Patrones Avanzados del Backend

Este documento complementa `backend-architecture` y `backend-core-logic`. Define patrones concretos para operaciones que van más allá de un CRUD simple.

---

## 1. Módulo `src/shared/` — Utilidades Compartidas

**Regla crítica:** Antes de crear cualquier utilidad (logger, helper de respuesta, formateador), verifica si ya existe en `src/shared/`.

```text
src/shared/
└── utils/
    ├── api-response.ts    # sendSuccess() y sendError() — SIEMPRE usa estas funciones
    └── logger.ts          # Logger de Winston — SIEMPRE usa este, nunca console.log
```

**Uso obligatorio en todos los controladores:**

```typescript
import { sendSuccess, sendError } from '../../../shared/utils/api-response.js';
import logger from '../../../shared/utils/logger.js';

// ✅ Respuesta exitosa
return sendSuccess(res, { id: result.insertId, ...data });

// ✅ Respuesta de error con status personalizado
return sendError(res, 'El recurso no fue encontrado.', 404);

// ✅ Log estructurado (no usar console.log)
logger.info('Operación completada', { entityId: id, userId: req.user.id });
logger.error('Fallo en operación', { error: err.message, stack: err.stack });
```

**Queda prohibido** usar `res.json()` directamente en controladores. Siempre `sendSuccess` / `sendError`.

---

## 2. Validación de Variables de Entorno

Al arrancar el servidor, todas las variables de entorno requeridas deben validarse. Si falta una, el servidor **no debe iniciar**.

```typescript
// src/config/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  DB_HOST: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:', parsed.error.flatten().fieldErrors);
  process.exit(1); // Falla rápido — mejor que un crash en producción
}

export const env = parsed.data;
```

**Uso en toda la app:**
```typescript
// ✅ Siempre importa env en lugar de process.env directamente
import { env } from '../config/env.js';
const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '8h' });
```

---

## 3. Patrón de Paginación

Todo endpoint que devuelva una lista debe soportar paginación desde el inicio. Nunca devuelvas arrays sin paginar.

**Interfaz de retorno estándar:**
```typescript
// src/shared/types/pagination.types.ts
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}
```

**Implementación en un servicio:**
```typescript
import type { PaginatedResult, PaginationParams } from '../../../shared/types/pagination.types.js';

export class GetAffiliationsService {
  async execute(
    officeId: number,
    params: PaginationParams & { month?: number; year?: number }
  ): Promise<PaginatedResult<Affiliation>> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, params.limit ?? 20); // Máximo 100 registros por página
    const offset = (page - 1) * limit;

    const [rows]: any = await pool.query(
      `SELECT SQL_CALC_FOUND_ROWS * FROM monthly_affiliations
       WHERE office_id = ? AND month = ? AND year = ?
       LIMIT ? OFFSET ?`,
      [officeId, params.month, params.year, limit, offset]
    );

    const [[{ total }]]: any = await pool.query('SELECT FOUND_ROWS() as total');

    return {
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
```

**Schema de Zod para los query params del controlador:**
```typescript
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
// Parsear desde req.query: paginationSchema.parse(req.query)
```

---

## 4. Patrón de Transacciones MySQL

Cuando una operación de negocio modifica **más de una tabla**, **siempre** usa una transacción. De lo contrario, un error parcial dejará la base de datos en estado corrupto.

```typescript
import pool from '../../../config/database.js';
import type { PoolConnection } from 'mysql2/promise';

export class CreateAffiliationWithInvoiceService {
  async execute(data: CreateAffiliationDTO) {
    const conn: PoolConnection = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // 1. Crear afiliación
      const [affResult]: any = await conn.query(
        'INSERT INTO monthly_affiliations SET ?',
        [{ ...data, created_at: new Date() }]
      );
      const affiliationId = affResult.insertId;

      // 2. Crear factura vinculada
      await conn.query(
        'INSERT INTO facturas SET ?',
        [{ affiliation_id: affiliationId, status: 'emitida', created_at: new Date() }]
      );

      await conn.commit();
      return { affiliationId };
    } catch (error) {
      await conn.rollback(); // Revierte ambas operaciones si cualquiera falla
      throw error; // Re-lanza para que el globalErrorHandler lo capture
    } finally {
      conn.release(); // SIEMPRE libera la conexión
    }
  }
}
```

**Regla:** El `finally { conn.release() }` es **obligatorio**. Sin él, el pool de conexiones se agota y la app muere en producción.

---

## 5. Soft Delete — Patrón Estándar

Las tablas del proyecto usan borrado lógico (soft delete), no `DELETE` físico. Sigue este patrón:

```typescript
export class DeleteClientService {
  async execute(clientId: number, deletedByUserId: number) {
    const [result]: any = await pool.query(
      `UPDATE clients
       SET is_active = 0, deleted_by_user_id = ?, deleted_at = NOW()
       WHERE id = ? AND is_active = 1`,
      [deletedByUserId, clientId]
    );

    if (result.affectedRows === 0) {
      const err: any = new Error('Cliente no encontrado o ya fue eliminado.');
      err.status = 404;
      throw err;
    }
  }
}
```

**Regla:** Todos los `SELECT` deben incluir `WHERE is_active = 1` para no retornar registros eliminados.

---

## 6. Convención de Nomenclatura de Archivos

Para mantener consistencia en todo el proyecto:

| Tipo de archivo | Patrón | Ejemplo |
|---|---|---|
| Controlador | `{accion}.controller.ts` | `login.controller.ts`, `getClients.controller.ts` |
| Servicio | `{accion}.service.ts` | `login.service.ts`, `createAffiliation.service.ts` |
| Rutas | `{feature}.routes.ts` | `auth.routes.ts`, `affiliations.routes.ts` |
| Schema Zod | `{accion}.schema.ts` | `login.schema.ts`, `createClient.schema.ts` |
| Tipos | `{feature}.types.ts` | `auth.types.ts`, `affiliation.types.ts` |
| Middleware | `{nombre}.middleware.ts` | `auth.middleware.ts`, `rateLimit.middleware.ts` |

**Para features con múltiples operaciones**, cada operación es su propio controlador y servicio:
```text
features/clients/
├── controllers/
│   ├── getClients.controller.ts
│   ├── getClientById.controller.ts
│   ├── createClient.controller.ts
│   └── updateClient.controller.ts
├── services/
│   ├── getClients.service.ts
│   └── createClient.service.ts
└── clients.routes.ts
```

---

## 7. Logging Estructurado — Niveles y Cuándo Usarlos

```typescript
import logger from '../../../shared/utils/logger.js';

// INFO: Flujo normal de la aplicación (se ve en producción)
logger.info('Usuario autenticado', { userId: user.id, role: user.role });
logger.info('Afiliación creada', { affiliationId: result.insertId, officeId });

// WARN: Situaciones anómalas que no son errores fatales
logger.warn('Token próximo a expirar', { userId, expiresIn: '15min' });

// ERROR: Fallos que deben investigarse (se alertan en producción)
logger.error('Fallo al conectar a la DB', { host: env.DB_HOST, error: err.message });

// DEBUG: Solo en desarrollo — nunca en producción
logger.debug('Payload recibido', { body: req.body }); // NODE_ENV=development
```

**Regla:** `console.log` está **prohibido** en toda la aplicación. Siempre `logger`.
