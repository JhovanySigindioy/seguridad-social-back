import type { Request, Response, NextFunction } from 'express';
import logger from './shared/utils/logger.js';

const MYSQL_DUPLICATE_ENTRY = 1062;
const MYSQL_FOREIGN_KEY = 1452;
const MYSQL_NOT_NULL = 1048;

interface MysqlError extends Error {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
  status?: number;
}

export const globalErrorHandler = (
  err: MysqlError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error('Error detectado:', {
    message: err.message,
    code: err.code,
    errno: err.errno,
    path: req.path,
    method: req.method,
  });

  if (err.errno === MYSQL_DUPLICATE_ENTRY) {
    const keyMatch = err.sqlMessage?.match(/for key '([^']+)'/);
    const key = keyMatch ? keyMatch[1] : 'unknown';

    if (key === 'uk_affiliation_period') {
      return res.status(409).json({
        success: false,
        data: null,
        error: 'Este cliente ya tiene una afiliación registrada para el mismo mes y año. Solo puedes tener una afiliación por período.',
      });
    }

    if (key === 'uk_client_employer') {
      return res.status(409).json({
        success: false,
        data: null,
        error: 'Este cliente ya está vinculado a esta empresa. La relación ya existe.',
      });
    }

    if (key === 'uk_client_identification') {
      return res.status(409).json({
        success: false,
        data: null,
        error: 'Ya existe un cliente registrado con este número de identificación.',
      });
    }

    return res.status(409).json({
      success: false,
      data: null,
      error: 'Ya existe un registro duplicado con los mismos datos. Verifica la información e intenta de nuevo.',
    });
  }

  if (err.errno === MYSQL_FOREIGN_KEY) {
    return res.status(400).json({
      success: false,
      data: null,
      error: 'No se puede procesar esta operación porque hace referencia a datos que no existen en el sistema.',
    });
  }

  if (err.errno === MYSQL_NOT_NULL) {
    const fieldMatch = err.sqlMessage?.match(/Column '(\w+)'/);
    const field = fieldMatch ? fieldMatch[1] : 'algun campo';
    return res.status(400).json({
      success: false,
      data: null,
      error: `El campo "${field}" es obligatorio. Por favor completa todos los campos requeridos.`,
    });
  }

  if (err.status === 404) {
    return res.status(404).json({
      success: false,
      data: null,
      error: err.message || 'Recurso no encontrado.',
    });
  }

  if (err.status === 403) {
    return res.status(403).json({
      success: false,
      data: null,
      error: err.message || 'No tienes permisos para realizar esta acción.',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    data: null,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor. Intenta de nuevo más tarde.',
  });
};