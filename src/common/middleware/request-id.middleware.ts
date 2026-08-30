import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

const REQUEST_ID_HEADER = 'X-Request-ID';

/**
 * Gera um UUID por requisição (req.id), devolvido no header X-Request-ID e
 * usado para correlacionar logs estruturados (login falho, consulta pública,
 * exclusão de conta, eventos de audit log) da mesma requisição.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  req.id = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
