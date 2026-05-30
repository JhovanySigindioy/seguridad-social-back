import type { Request, Response, NextFunction } from 'express';

/**
 * asyncHandler: Envuelve controladores async para capturar errores automáticamente
 * y pasarlos al globalErrorHandler via next(error).
 * Elimina la necesidad de try/catch repetitivos en cada controlador.
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
