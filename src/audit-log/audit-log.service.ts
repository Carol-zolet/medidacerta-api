import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AcaoAuditoria = 'CREATE_MEDIDAS' | 'UPDATE_MEDIDAS' | 'DELETE_CONTA';

interface RegistrarAuditoriaParams {
  usuarioId: string;
  acao: AcaoAuditoria;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
  ip?: string;
  requestId?: string;
}

/**
 * Trilha de auditoria interna (sem endpoint de leitura — não é exposta pela API).
 * Serializa antes/depois via JSON.parse(JSON.stringify(...)) para garantir um
 * snapshot plano (evita surpresas com instâncias de Decimal/Date do Prisma
 * indo pro campo Json).
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registrar(params: RegistrarAuditoriaParams): Promise<void> {
    const { usuarioId, acao, dadosAntes, dadosDepois, ip, requestId } = params;

    await this.prisma.auditLog.create({
      data: {
        usuarioId,
        acao,
        dadosAntes: this.paraJson(dadosAntes),
        dadosDepois: this.paraJson(dadosDepois),
        ip,
      },
    });

    this.logger.log(
      `[audit] acao=${acao} usuarioId=${usuarioId} ip=${ip ?? 'desconhecido'} requestId=${requestId ?? 'desconhecido'}`,
    );
  }

  private paraJson(valor: unknown) {
    if (valor === undefined || valor === null) {
      return undefined;
    }
    return JSON.parse(JSON.stringify(valor));
  }
}
