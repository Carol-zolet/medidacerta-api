// Estende o Request do Express com o campo `id`, preenchido pelo
// RequestIdMiddleware (um UUID por requisição, também devolvido no header
// X-Request-ID e propagado pros logs estruturados).
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export {};
