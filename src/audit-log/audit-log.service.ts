import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AcaoAuditoria =
  'CREATE_MEDIDAS' | 'UPDATE_MEDIDAS' | 'DELETE_CONTA' | 'CONSULTA_PUBLICA';

interface RegistrarAuditoriaParams {
  usuarioId: string;
  acao: AcaoAuditoria;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
  ip?: string;
  requestId?: string;
}

const RESUMOS_AMIGAVEIS: Record<AcaoAuditoria, string> = {
  CREATE_MEDIDAS: 'Medidas cadastradas',
  UPDATE_MEDIDAS: 'Medidas atualizadas',
  DELETE_CONTA: 'Conta excluída',
  CONSULTA_PUBLICA: 'Consulta pública ao seu código de acesso',
};

const LIMITE_HISTORICO = 50;

/**
 * Trilha de auditoria interna. A tabela em si não tem endpoint de leitura
 * genérico (nunca dados_antes/dados_depois brutos são expostos) — só o
 * resumo amigável via GET /audit-log/me, restrito ao próprio usuário.
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

  /**
   * Histórico resumido do próprio usuário (GET /audit-log/me). O ID sempre
   * vem do JWT no controller — nunca aceita um ID de outro usuário, então
   * nunca vaza dados de terceiros (mesma proteção BOLA do resto da API).
   */
  async listarMinhasUltimas(usuarioId: string) {
    const registros = await this.prisma.auditLog.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: 'desc' },
      take: LIMITE_HISTORICO,
    });

    return registros.map((registro) => ({
      acao: registro.acao,
      resumo: RESUMOS_AMIGAVEIS[registro.acao as AcaoAuditoria] ?? registro.acao,
      ip: registro.ip,
      criadoEm: registro.criadoEm,
    }));
  }

  private paraJson(valor: unknown) {
    if (valor === undefined || valor === null) {
      return undefined;
    }
    return JSON.parse(JSON.stringify(valor));
  }
}
