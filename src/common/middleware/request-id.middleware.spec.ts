import { Request, Response } from 'express';
import { requestIdMiddleware } from './request-id.middleware';

describe('requestIdMiddleware', () => {
  it('gera um UUID, atribui a req.id e devolve no header X-Request-ID', () => {
    const req = {} as Request;
    const setHeader = jest.fn();
    const res = { setHeader } as unknown as Response;
    const next = jest.fn();

    requestIdMiddleware(req, res, next);

    expect(req.id).toEqual(
      expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
    );
    expect(setHeader).toHaveBeenCalledWith('X-Request-ID', req.id);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('gera um id diferente a cada chamada', () => {
    const next = jest.fn();

    const req1 = {} as Request;
    requestIdMiddleware(req1, { setHeader: jest.fn() } as unknown as Response, next);

    const req2 = {} as Request;
    requestIdMiddleware(req2, { setHeader: jest.fn() } as unknown as Response, next);

    expect(req1.id).not.toBe(req2.id);
  });
});
