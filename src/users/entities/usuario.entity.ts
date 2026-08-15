import { Exclude } from 'class-transformer';

/**
 * Representa o usuário retornado pela API. Campos sensíveis são marcados
 * com @Exclude() e removidos automaticamente da resposta JSON pelo
 * ClassSerializerInterceptor (aplicado globalmente em AppModule) — mesmo
 * que o objeto original vindo do Prisma contenha esses campos.
 */
export class UsuarioEntity {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  codigoAcesso: string | null;
  createdAt: Date;
  updatedAt: Date;

  @Exclude()
  senhaHash: string;

  @Exclude()
  resetToken: string | null;

  @Exclude()
  resetTokenExpires: Date | null;

  constructor(partial: Partial<UsuarioEntity>) {
    Object.assign(this, partial);
  }
}
