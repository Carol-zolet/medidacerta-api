import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

describe('Audit Log (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const prismaMock = {
    usuario: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    medida: { findUnique: jest.fn(), upsert: jest.fn() },
    auditLog: { create: jest.fn(), findMany: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    jwtService = moduleRef.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  function tokenPara(usuarioId: string) {
    return jwtService.sign({ sub: usuarioId, email: `${usuarioId}@example.com` });
  }

  it('GET /audit-log/me sem token retorna 401', async () => {
    await request(app.getHttpServer()).get('/audit-log/me').expect(401);
  });

  it('GET /audit-log/me retorna lista vazia (sem erro) quando não há histórico', async () => {
    prismaMock.auditLog.findMany.mockResolvedValueOnce([]);

    const res = await request(app.getHttpServer())
      .get('/audit-log/me')
      .set('Authorization', `Bearer ${tokenPara('usuario-A')}`)
      .expect(200);

    expect(res.body).toEqual([]);
  });

  it('retorna resumo amigável, sem dados_antes/dados_depois brutos', async () => {
    const criadoEm = new Date('2026-01-01T10:00:00.000Z').toISOString();
    prismaMock.auditLog.findMany.mockResolvedValueOnce([
      {
        id: 'a1',
        usuarioId: 'usuario-A',
        acao: 'CONSULTA_PUBLICA',
        dadosAntes: null,
        dadosDepois: { codigo: 'MC-AAAAAA', segredoQueNaoDeveVazar: true },
        ip: '127.0.0.1',
        criadoEm,
      },
    ]);

    const res = await request(app.getHttpServer())
      .get('/audit-log/me')
      .set('Authorization', `Bearer ${tokenPara('usuario-A')}`)
      .expect(200);

    expect(res.body).toEqual([
      {
        acao: 'CONSULTA_PUBLICA',
        resumo: 'Consulta pública ao seu código de acesso',
        ip: '127.0.0.1',
        criadoEm,
      },
    ]);
    expect(JSON.stringify(res.body)).not.toContain('segredoQueNaoDeveVazar');
  });

  it('BOLA: só consulta o audit log com o ID do próprio usuário (do JWT), nunca de outro', async () => {
    prismaMock.auditLog.findMany.mockResolvedValueOnce([]);

    await request(app.getHttpServer())
      .get('/audit-log/me')
      .set('Authorization', `Bearer ${tokenPara('usuario-A')}`)
      .expect(200);

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuarioId: 'usuario-A' } }),
    );

    prismaMock.auditLog.findMany.mockResolvedValueOnce([]);

    await request(app.getHttpServer())
      .get('/audit-log/me')
      .set('Authorization', `Bearer ${tokenPara('usuario-B')}`)
      .expect(200);

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuarioId: 'usuario-B' } }),
    );
  });
});
