import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { JwtService } from '@nestjs/jwt';

/**
 * Testes de Broken Object Level Authorization (BOLA / OWASP API1).
 *
 * A API nunca aceita um ID de usuário vindo do cliente (URL ou corpo) para
 * acessar dados privados — o ID usado em toda query autenticada vem sempre
 * do JWT (req.user.sub). Estes testes tentam "forjar" acesso aos dados de
 * outro usuário e confirmam que isso é impossível.
 */
describe('BOLA - Broken Object Level Authorization (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const usuarioA = {
    id: 'usuario-A-id',
    nome: 'Ana',
    sobrenome: 'A',
    email: 'ana@example.com',
    senhaHash: 'hash-a',
    codigoAcesso: 'MC-AAAAAA',
    resetToken: null,
    resetTokenExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const usuarioB = {
    id: 'usuario-B-id',
    nome: 'Beatriz',
    sobrenome: 'B',
    email: 'beatriz@example.com',
    senhaHash: 'hash-b',
    codigoAcesso: 'MC-BBBBBB',
    resetToken: null,
    resetTokenExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const medidasDeB = {
    id: 'medida-B-id',
    usuarioId: usuarioB.id,
    busto: 90,
    torax: 85,
    cintura: 70,
    quadril: 95,
    coxa: 55,
    numeroCalcado: 38,
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

  function tokenPara(usuario: { id: string; email: string }) {
    return jwtService.sign({ sub: usuario.id, email: usuario.email });
  }

  it('GET /medidas/me sempre consulta o banco usando o ID do JWT, nunca um valor do cliente', async () => {
    const tokenDeA = tokenPara(usuarioA);
    prismaMock.medida.findUnique.mockResolvedValueOnce({
      ...medidasDeB,
      usuarioId: usuarioA.id,
    });

    await request(app.getHttpServer())
      .get('/medidas/me')
      .set('Authorization', `Bearer ${tokenDeA}`)
      .expect(200);

    // A query ao Prisma foi feita com o ID extraído do JWT (usuarioA), não com
    // qualquer valor manipulável pelo cliente.
    expect(prismaMock.medida.findUnique).toHaveBeenCalledWith({
      where: { usuarioId: usuarioA.id },
    });
  });

  it('DELETE /users/me só pode excluir a própria conta (ID sempre vem do JWT)', async () => {
    const tokenDeA = tokenPara(usuarioA);
    prismaMock.usuario.delete.mockResolvedValueOnce({});

    await request(app.getHttpServer())
      .delete('/users/me')
      .set('Authorization', `Bearer ${tokenDeA}`)
      .expect(200);

    expect(prismaMock.usuario.delete).toHaveBeenCalledWith({ where: { id: usuarioA.id } });
    // Nunca chamado com o ID de outro usuário.
    expect(prismaMock.usuario.delete).not.toHaveBeenCalledWith({ where: { id: usuarioB.id } });
  });

  it('POST /medidas rejeita (400) tentativa de forjar o dono via campo extra no corpo', async () => {
    const tokenDeA = tokenPara(usuarioA);

    await request(app.getHttpServer())
      .post('/medidas')
      .set('Authorization', `Bearer ${tokenDeA}`)
      .send({
        busto: 90,
        torax: 85,
        cintura: 70,
        quadril: 95,
        coxa: 55,
        numero_calcado: 38,
        usuarioId: usuarioB.id, // tentativa de impersonar outro usuário
      })
      .expect(400);

    // A requisição nunca chega a tocar o Prisma: é rejeitada pelo ValidationPipe
    // (forbidNonWhitelisted) antes de qualquer acesso a dados.
    expect(prismaMock.medida.upsert).not.toHaveBeenCalled();
  });

  it('não existe rota que aceite um ID de usuário arbitrário na URL (superfície de ataque inexistente)', async () => {
    const tokenDeA = tokenPara(usuarioA);

    await request(app.getHttpServer())
      .get(`/users/${usuarioB.id}`)
      .set('Authorization', `Bearer ${tokenDeA}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/medidas/${usuarioB.id}`)
      .set('Authorization', `Bearer ${tokenDeA}`)
      .expect(404);
  });

  it('um JWT válido de um usuário não consegue ler dados de outro via /users/me (isolamento por token)', async () => {
    const tokenDeA = tokenPara(usuarioA);
    prismaMock.usuario.findUnique.mockResolvedValueOnce(usuarioA);

    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${tokenDeA}`)
      .expect(200);

    expect(res.body.id).toBe(usuarioA.id);
    expect(res.body.email).toBe(usuarioA.email);
    expect(prismaMock.usuario.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: usuarioA.id } }),
    );
  });
});
