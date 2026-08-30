import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  const prismaMock = {
    usuario: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/register cria um usuário com sucesso (201)', async () => {
    prismaMock.usuario.findUnique.mockResolvedValueOnce(null);
    prismaMock.usuario.create.mockResolvedValueOnce({
      id: 'u1',
      nome: 'Maria',
      sobrenome: 'Silva',
      email: 'maria@example.com',
    });

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ nome: 'Maria', sobrenome: 'Silva', email: 'maria@example.com', senha: 'senha123' })
      .expect(201);

    expect(res.body.email).toBe('maria@example.com');
  });

  it('POST /auth/register com e-mail duplicado retorna 409', async () => {
    prismaMock.usuario.findUnique.mockResolvedValueOnce({
      id: 'u1',
      email: 'maria@example.com',
    });

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ nome: 'Maria', sobrenome: 'Silva', email: 'maria@example.com', senha: 'senha123' })
      .expect(409);

    expect(res.body).toMatchObject({ statusCode: 409 });
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('path', '/auth/register');
  });

  it('POST /auth/login com credenciais inválidas retorna 401', async () => {
    prismaMock.usuario.findUnique.mockResolvedValueOnce(null);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'naoexiste@example.com', senha: 'qualquer123' })
      .expect(401);

    expect(res.body.statusCode).toBe(401);
  });

  it('POST /auth/register com payload inválido retorna 400', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({ nome: 'Maria' }).expect(400);
  });

  describe('Enumeration - mensagem de login sempre genérica', () => {
    it('e-mail inexistente e senha errada retornam exatamente a mesma mensagem (401)', async () => {
      // Caso 1: e-mail não cadastrado
      prismaMock.usuario.findUnique.mockResolvedValueOnce(null);
      const resEmailInexistente = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'naoexiste@example.com', senha: 'qualquer1234' })
        .expect(401);

      // Caso 2: e-mail existe, senha errada
      prismaMock.usuario.findUnique.mockResolvedValueOnce({
        id: 'u1',
        email: 'maria@example.com',
        senhaHash: '$2b$10$hashQualquerCoisaQueNaoBateComASenhaEnviada',
      });
      const resSenhaErrada = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'maria@example.com', senha: 'senhaErrada123' })
        .expect(401);

      expect(resEmailInexistente.body.message).toBe(resSenhaErrada.body.message);
      expect(resEmailInexistente.body.message).toBe('Credenciais inválidas');
    });
  });

  describe('Política de senha no registro', () => {
    it('rejeita (400) senha com menos de 8 caracteres', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ nome: 'Ana', sobrenome: 'Curta', email: 'curta@example.com', senha: 'abc123' })
        .expect(400);

      expect(JSON.stringify(res.body.message)).toContain('8 caracteres');
    });

    it('rejeita (400) senha sem nenhum número', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Ana',
          sobrenome: 'SemNumero',
          email: 'semnumero@example.com',
          senha: 'senhaSemNumero',
        })
        .expect(400);

      expect(JSON.stringify(res.body.message)).toContain('número');
    });

    it('aceita (201) senha com 8+ caracteres e ao menos um número', async () => {
      prismaMock.usuario.findUnique.mockResolvedValueOnce(null);
      prismaMock.usuario.create.mockResolvedValueOnce({
        id: 'u2',
        nome: 'Ana',
        sobrenome: 'Valida',
        email: 'valida@example.com',
      });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nome: 'Ana',
          sobrenome: 'Valida',
          email: 'valida@example.com',
          senha: 'senhaValida1',
        })
        .expect(201);
    });
  });
});
