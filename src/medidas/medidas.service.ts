import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UpsertMedidasDto } from './dto/upsert-medidas.dto';

const ALFANUMERICO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I para evitar confusão

function gerarSufixo(tamanho = 6): string {
  let resultado = '';
  for (let i = 0; i < tamanho; i++) {
    resultado += ALFANUMERICO[Math.floor(Math.random() * ALFANUMERICO.length)];
  }
  return resultado;
}

@Injectable()
export class MedidasService {
  private readonly logger = new Logger(MedidasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async gerarCodigoAcessoUnico(): Promise<string> {
    let codigo: string;
    let existe: boolean;

    do {
      codigo = `MC-${gerarSufixo()}`;

      const usuario = await this.prisma.usuario.findUnique({
        where: { codigoAcesso: codigo },
      });
      existe = !!usuario;
    } while (existe);

    return codigo;
  }

  async upsertMinhasMedidas(
    usuarioId: string,
    dto: UpsertMedidasDto,
    ip?: string,
    requestId?: string,
  ) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (!usuario.codigoAcesso) {
      const codigoAcesso = await this.gerarCodigoAcessoUnico();
      await this.prisma.usuario.update({
        where: { id: usuarioId },
        data: { codigoAcesso },
      });
    }

    const dadosMedida = {
      busto: dto.busto,
      torax: dto.torax,
      cintura: dto.cintura,
      quadril: dto.quadril,
      coxa: dto.coxa,
      numeroCalcado: dto.numero_calcado,
    };

    // Estado "antes" para a auditoria: se não existir ainda, é uma criação.
    const medidaAntes = await this.prisma.medida.findUnique({ where: { usuarioId } });

    const resultado = await this.prisma.medida.upsert({
      where: { usuarioId },
      create: { usuarioId, ...dadosMedida },
      update: dadosMedida,
    });

    await this.auditLogService.registrar({
      usuarioId,
      acao: medidaAntes ? 'UPDATE_MEDIDAS' : 'CREATE_MEDIDAS',
      dadosAntes: medidaAntes,
      dadosDepois: resultado,
      ip,
      requestId,
    });

    return resultado;
  }

  async findMinhasMedidas(usuarioId: string) {
    const medida = await this.prisma.medida.findUnique({
      where: { usuarioId },
    });

    if (!medida) {
      throw new NotFoundException('Medidas não encontradas para este usuário');
    }

    return medida;
  }

  async findByCodigoAcesso(codigo: string, ip?: string, requestId?: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { codigoAcesso: codigo },
      include: { medidas: true },
    });

    if (!usuario || !usuario.medidas) {
      this.logger.warn(
        `Consulta pública falhou (código não encontrado): codigo=${codigo} ip=${ip ?? 'desconhecido'} requestId=${requestId ?? 'desconhecido'}`,
      );
      throw new NotFoundException('Código não encontrado');
    }

    this.logger.log(
      `Consulta pública bem-sucedida: codigo=${codigo} ip=${ip ?? 'desconhecido'} requestId=${requestId ?? 'desconhecido'}`,
    );
    return usuario.medidas;
  }
}
