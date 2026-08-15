import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

describe('Medidas (e2e)', () => {
  let app: INestApplication;

  const prismaMock = {
    usuario: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    medida: { findUnique: jest.fn(), upsert: jest.fn() },
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /medidas/me sem token retorna 401', async () => {
    const res = await request(app.getHttpServer()).get('/medidas/me').expect(401);
    expect(res.body).toMatchObject({ statusCode: 401 });
    expect(res.body).toHaveProperty('timestamp');
  });

  it('POST /medidas sem token retorna 401', async () => {
    await request(app.getHttpServer())
      .post('/medidas')
      .send({ busto: 90, torax: 85, cintura: 70, quadril: 95, coxa: 55, numero_calcado: 38 })
      .expect(401);
  });

  it('GET /api/v1/medidas/:codigo inexistente retorna 404 no formato padronizado', async () => {
    prismaMock.usuario.findUnique.mockResolvedValueOnce(null);

    const res = await request(app.getHttpServer())
      .get('/api/v1/medidas/MC-INEXISTENTE')
      .expect(404);

    expect(res.body).toMatchObject({
      statusCode: 404,
      message: 'Código não encontrado',
    });
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('path', '/api/v1/medidas/MC-INEXISTENTE');
  });

  it('GET /api/v1/medidas/:codigo existente retorna 200 (sem autenticação)', async () => {
    prismaMock.usuario.findUnique.mockResolvedValueOnce({
      id: 'u1',
      codigoAcesso: 'MC-ABC123',
      medidas: {
        id: 'm1',
        usuarioId: 'u1',
        busto: 90.5,
        torax: 85,
        cintura: 70,
        quadril: 95,
        coxa: 55,
        numeroCalcado: 38.5,
      },
    });

    const res = await request(app.getHttpServer()).get('/api/v1/medidas/MC-ABC123').expect(200);

    expect(res.body.id).toBe('m1');
  });

  it('GET /health responde com status do Postgres', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });
});
