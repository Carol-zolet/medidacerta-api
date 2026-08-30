import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

describe('X-Request-ID (e2e)', () => {
  let app: INestApplication;

  const prismaMock = {
    usuario: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    medida: { findUnique: jest.fn(), upsert: jest.fn() },
    auditLog: { create: jest.fn() },
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
  });

  afterAll(async () => {
    await app.close();
  });

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  it('inclui X-Request-ID (UUID) em uma resposta de sucesso', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.headers['x-request-id']).toEqual(expect.stringMatching(UUID_REGEX));
  });

  it('inclui X-Request-ID mesmo em respostas de erro (401)', async () => {
    const res = await request(app.getHttpServer()).get('/medidas/me').expect(401);
    expect(res.headers['x-request-id']).toEqual(expect.stringMatching(UUID_REGEX));
  });

  it('gera um X-Request-ID diferente a cada requisição', async () => {
    const res1 = await request(app.getHttpServer()).get('/health');
    const res2 = await request(app.getHttpServer()).get('/health');

    expect(res1.headers['x-request-id']).not.toBe(res2.headers['x-request-id']);
  });
});
