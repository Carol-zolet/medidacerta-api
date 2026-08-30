import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UsuarioEntity } from './entities/usuario.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

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

  async remove(usuarioId: string, ip?: string, requestId?: string) {
    // Snapshot final antes de apagar, para a trilha de auditoria. Exclui
    // deliberadamente senhaHash/resetToken/resetTokenExpires do registro de
    // auditoria (mesmo sendo interno, não há motivo pra guardar segredos ali).
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { medidas: true },
    });

    if (usuario) {
      await this.auditLogService.registrar({
        usuarioId,
        acao: 'DELETE_CONTA',
        dadosAntes: {
          nome: usuario.nome,
          sobrenome: usuario.sobrenome,
          email: usuario.email,
          codigoAcesso: usuario.codigoAcesso,
          createdAt: usuario.createdAt,
          medidas: usuario.medidas,
        },
        dadosDepois: null,
        ip,
        requestId,
      });
    }

    await this.prisma.usuario.delete({ where: { id: usuarioId } });
    this.logger.warn(
      `Conta excluída: usuarioId=${usuarioId} ip=${ip ?? 'desconhecido'} requestId=${requestId ?? 'desconhecido'}`,
    );
    return { message: 'Usuário removido com sucesso' };
  }
}
