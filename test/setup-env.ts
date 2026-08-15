// Garante variáveis de ambiente obrigatórias mesmo se o .env não estiver presente
// (ex: rodando no CI). Os testes usam PrismaService mockado, então DATABASE_URL
// só precisa ter um formato válido — não precisa apontar para um banco real.
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5433/medidacerta_test?schema=public';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-nao-usar-em-producao';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1h';
process.env.NODE_ENV = 'test';
