import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioEntity } from './entities/usuario.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findMe(usuarioId: string) {
    // Busca o registro completo do Prisma; campos sensíveis (senhaHash,
    // resetToken, resetTokenExpires) são removidos automaticamente na
    // serialização por causa dos @Exclude() em UsuarioEntity.
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return new UsuarioEntity(usuario);
  }

  async remove(usuarioId: string, ip?: string) {
    await this.prisma.usuario.delete({ where: { id: usuarioId } });
    this.logger.warn(`Conta excluída: usuarioId=${usuarioId} ip=${ip ?? 'desconhecido'}`);
    return { message: 'Usuário removido com sucesso' };
  }
}
