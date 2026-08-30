import { Test } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let prisma: {
    auditLog: { create: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      auditLog: { create: jest.fn(), findMany: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [AuditLogService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(AuditLogService);
  });

  describe('registrar', () => {
    it('cria o registro no Prisma com os dados serializados', async () => {
      prisma.auditLog.create.mockResolvedValueOnce({});

      await service.registrar({
        usuarioId: 'u1',
        acao: 'CREATE_MEDIDAS',
        dadosDepois: { busto: 90 },
        ip: '127.0.0.1',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          usuarioId: 'u1',
          acao: 'CREATE_MEDIDAS',
          dadosAntes: undefined,
          dadosDepois: { busto: 90 },
          ip: '127.0.0.1',
        },
      });
    });
  });

  describe('listarMinhasUltimas', () => {
    it('busca só os registros do usuário informado, mais recentes primeiro, limitado a 50', async () => {
      prisma.auditLog.findMany.mockResolvedValueOnce([]);

      await service.listarMinhasUltimas('u1');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { usuarioId: 'u1' },
        orderBy: { criadoEm: 'desc' },
        take: 50,
      });
    });

    it('retorna lista vazia (sem erro) quando não há histórico', async () => {
      prisma.auditLog.findMany.mockResolvedValueOnce([]);

      const resultado = await service.listarMinhasUltimas('u1');

      expect(resultado).toEqual([]);
    });

    it('converte cada registro num resumo amigável, sem expor dados_antes/dados_depois', async () => {
      const agora = new Date('2026-01-01T10:00:00Z');
      prisma.auditLog.findMany.mockResolvedValueOnce([
        {
          id: 'a1',
          usuarioId: 'u1',
          acao: 'CONSULTA_PUBLICA',
          dadosAntes: null,
          dadosDepois: { codigo: 'MC-ABC123' },
          ip: '127.0.0.1',
          criadoEm: agora,
        },
        {
          id: 'a2',
          usuarioId: 'u1',
          acao: 'UPDATE_MEDIDAS',
          dadosAntes: { busto: 80 },
          dadosDepois: { busto: 90 },
          ip: '127.0.0.1',
          criadoEm: agora,
        },
      ]);

      const resultado = await service.listarMinhasUltimas('u1');

      expect(resultado).toEqual([
        {
          acao: 'CONSULTA_PUBLICA',
          resumo: 'Consulta pública ao seu código de acesso',
          ip: '127.0.0.1',
          criadoEm: agora,
        },
        { acao: 'UPDATE_MEDIDAS', resumo: 'Medidas atualizadas', ip: '127.0.0.1', criadoEm: agora },
      ]);
      // Nenhum item do resultado tem dadosAntes/dadosDepois.
      for (const item of resultado) {
        expect(item).not.toHaveProperty('dadosAntes');
        expect(item).not.toHaveProperty('dadosDepois');
      }
    });
  });
});
