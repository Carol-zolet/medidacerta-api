import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { JwtService } from '@nestjs/jwt';

/**
 * Testes de Excessive Data Exposure (OWASP API3): confirma que senhaHash,
 * resetToken e resetTokenExpires nunca aparecem em nenhuma resposta JSON,
 * mesmo quando o registro completo do Prisma (que os contém) é retornado
 * pelo service — a proteção vem do ClassSerializerInterceptor + @Exclude().
 */
describe('Excessive Data Exposure (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const usuarioCompleto = {
    id: 'u1',
    nome: 'Maria',
    sobrenome: 'Silva',
    email: 'maria@example.com',
    senhaHash: '$2b$10$segredoNuncaDeveVazarNaResposta',
    codigoAcesso: 'MC-ABC123',
    resetToken: 'token-secreto-de-reset',
    resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
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

  const CAMPOS_SENSIVEIS = ['senhaHash', 'senha_hash', 'resetToken', 'reset_token', 'resetTokenExpires'];

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

  it('GET /users/me nunca retorna senhaHash, resetToken ou resetTokenExpires', async () => {
    const token = jwtService.sign({ sub: usuarioCompleto.id, email: usuarioCompleto.email });
    prismaMock.usuario.findUnique.mockResolvedValueOnce(usuarioCompleto);

    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const corpoBruto = JSON.stringify(res.body);
    for (const campo of CAMPOS_SENSIVEIS) {
      expect(corpoBruto).not.toContain(campo);
    }
    expect(res.body).not.toHaveProperty('senhaHash');
    expect(res.body).not.toHaveProperty('resetToken');
    expect(res.body).not.toHaveProperty('resetTokenExpires');

    // Confirma que os campos permitidos continuam presentes.
    expect(res.body).toMatchObject({
      id: usuarioCompleto.id,
      email: usuarioCompleto.email,
      codigoAcesso: usuarioCompleto.codigoAcesso,
    });
  });

  it('POST /auth/register nunca retorna senhaHash mesmo que o Prisma o inclua no objeto criado', async () => {
    prismaMock.usuario.findUnique.mockResolvedValueOnce(null);
    prismaMock.usuario.create.mockResolvedValueOnce(usuarioCompleto);

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ nome: 'Maria', sobrenome: 'Silva', email: 'maria@example.com', senha: 'senha1234' })
      .expect(201);

    const corpoBruto = JSON.stringify(res.body);
    for (const campo of CAMPOS_SENSIVEIS) {
      expect(corpoBruto).not.toContain(campo);
    }
  });
});
