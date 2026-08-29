import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

describe('Medidas (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const medidasValidas = {
    busto: 90.5,
    torax: 85.0,
    cintura: 70.0,
    quadril: 95.0,
    coxa: 55.0,
    numero_calcado: 38.5,
  };

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

    jwtService = moduleRef.get(JwtService);
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

  describe('Validação de outliers antropométricos', () => {
    function token() {
      return jwtService.sign({ sub: 'u1', email: 'ana@example.com' });
    }

    it('aceita (201) medidas dentro dos intervalos plausíveis', async () => {
      prismaMock.usuario.findUnique.mockResolvedValueOnce({ id: 'u1', codigoAcesso: 'MC-ABC123' });
      prismaMock.medida.upsert.mockResolvedValueOnce({ id: 'm1', usuarioId: 'u1' });

      await request(app.getHttpServer())
        .post('/medidas')
        .set('Authorization', `Bearer ${token()}`)
        .send(medidasValidas)
        .expect(201);
    });

    it('rejeita (400) cintura abaixo do mínimo (ex: digitação errada)', async () => {
      const res = await request(app.getHttpServer())
        .post('/medidas')
        .set('Authorization', `Bearer ${token()}`)
        .send({ ...medidasValidas, cintura: 10 })
        .expect(400);

      expect(JSON.stringify(res.body.message)).toContain('Cintura deve estar entre 40 e 200 cm');
      expect(prismaMock.medida.upsert).not.toHaveBeenCalled();
    });

    it('rejeita (400) cintura acima do máximo (ex: 300cm digitado por engano)', async () => {
      const res = await request(app.getHttpServer())
        .post('/medidas')
        .set('Authorization', `Bearer ${token()}`)
        .send({ ...medidasValidas, cintura: 300 })
        .expect(400);

      expect(JSON.stringify(res.body.message)).toContain('Cintura deve estar entre 40 e 200 cm');
      expect(prismaMock.medida.upsert).not.toHaveBeenCalled();
    });

    it('rejeita (400) número do calçado abaixo do mínimo', async () => {
      const res = await request(app.getHttpServer())
        .post('/medidas')
        .set('Authorization', `Bearer ${token()}`)
        .send({ ...medidasValidas, numero_calcado: 5 })
        .expect(400);

      expect(JSON.stringify(res.body.message)).toContain(
        'Número do calçado deve estar entre 15 e 55',
      );
    });

    it('rejeita (400) número do calçado acima do máximo', async () => {
      const res = await request(app.getHttpServer())
        .post('/medidas')
        .set('Authorization', `Bearer ${token()}`)
        .send({ ...medidasValidas, numero_calcado: 90 })
        .expect(400);

      expect(JSON.stringify(res.body.message)).toContain(
        'Número do calçado deve estar entre 15 e 55',
      );
    });
  });
});
