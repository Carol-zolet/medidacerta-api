import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MedidasService } from './medidas.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

describe('MedidasService', () => {
  let service: MedidasService;
  let prisma: {
    usuario: { findUnique: jest.Mock; update: jest.Mock };
    medida: { upsert: jest.Mock; findUnique: jest.Mock };
  };
  let auditLogService: { registrar: jest.Mock };

  const dtoBase = {
    busto: 90.5,
    torax: 85.0,
    cintura: 70.0,
    quadril: 95.0,
    coxa: 55.0,
    numero_calcado: 38.5,
  };

  beforeEach(async () => {
    prisma = {
      usuario: { findUnique: jest.fn(), update: jest.fn() },
      medida: { upsert: jest.fn(), findUnique: jest.fn() },
    };
    auditLogService = { registrar: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        MedidasService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = moduleRef.get(MedidasService);
  });

  describe('upsertMinhasMedidas', () => {
    it('gera codigo_acesso na primeira criação de medidas', async () => {
      prisma.usuario.findUnique
        .mockResolvedValueOnce({ id: 'u1', codigoAcesso: null }) // busca do usuário
        .mockResolvedValueOnce(null); // checagem de unicidade do código gerado
      prisma.usuario.update.mockResolvedValueOnce({});
      prisma.medida.upsert.mockResolvedValueOnce({ id: 'm1', usuarioId: 'u1' });

      await service.upsertMinhasMedidas('u1', dtoBase as any);

      expect(prisma.usuario.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { codigoAcesso: expect.stringMatching(/^MC-[A-Z0-9]{6}$/) },
      });
      expect(prisma.medida.upsert).toHaveBeenCalledTimes(1);
    });

    it('não gera novo codigo_acesso se o usuário já possui um', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce({ id: 'u1', codigoAcesso: 'MC-ABC123' });
      prisma.medida.upsert.mockResolvedValueOnce({ id: 'm1' });

      await service.upsertMinhasMedidas('u1', dtoBase as any);

      expect(prisma.usuario.update).not.toHaveBeenCalled();
    });

    it('lança NotFoundException se o usuário não existir', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce(null);

      await expect(service.upsertMinhasMedidas('inexistente', dtoBase as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('registra auditoria CREATE_MEDIDAS quando não havia medida anterior', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce({ id: 'u1', codigoAcesso: 'MC-ABC123' });
      prisma.medida.findUnique.mockResolvedValueOnce(null); // sem medida anterior
      const medidaCriada = { id: 'm1', usuarioId: 'u1', ...dtoBase };
      prisma.medida.upsert.mockResolvedValueOnce(medidaCriada);

      await service.upsertMinhasMedidas('u1', dtoBase as any, '127.0.0.1', 'req-1');

      expect(auditLogService.registrar).toHaveBeenCalledWith({
        usuarioId: 'u1',
        acao: 'CREATE_MEDIDAS',
        dadosAntes: null,
        dadosDepois: medidaCriada,
        ip: '127.0.0.1',
        requestId: 'req-1',
      });
    });

    it('registra auditoria UPDATE_MEDIDAS com valores antigos e novos quando já existia medida', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce({ id: 'u1', codigoAcesso: 'MC-ABC123' });
      const medidaAntiga = { id: 'm1', usuarioId: 'u1', busto: 80, torax: 75 };
      prisma.medida.findUnique.mockResolvedValueOnce(medidaAntiga);
      const medidaNova = { id: 'm1', usuarioId: 'u1', ...dtoBase };
      prisma.medida.upsert.mockResolvedValueOnce(medidaNova);

      await service.upsertMinhasMedidas('u1', dtoBase as any, '127.0.0.1', 'req-2');

      expect(auditLogService.registrar).toHaveBeenCalledWith({
        usuarioId: 'u1',
        acao: 'UPDATE_MEDIDAS',
        dadosAntes: medidaAntiga,
        dadosDepois: medidaNova,
        ip: '127.0.0.1',
        requestId: 'req-2',
      });
    });
  });

  describe('findMinhasMedidas', () => {
    it('lança NotFoundException se não houver medidas para o usuário', async () => {
      prisma.medida.findUnique.mockResolvedValueOnce(null);

      await expect(service.findMinhasMedidas('u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCodigoAcesso', () => {
    it('lança NotFoundException (404) quando o código de acesso não existe', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce(null);

      await expect(service.findByCodigoAcesso('MC-INEXISTENTE')).rejects.toThrow(NotFoundException);
    });

    it('retorna as medidas quando o código de acesso existe', async () => {
      const medidas = { id: 'm1', usuarioId: 'u1' };
      prisma.usuario.findUnique.mockResolvedValueOnce({
        id: 'u1',
        codigoAcesso: 'MC-ABC123',
        medidas,
      });

      const resultado = await service.findByCodigoAcesso('MC-ABC123');

      expect(resultado).toBe(medidas);
    });

    it('registra auditoria CONSULTA_PUBLICA quando o código é encontrado', async () => {
      const medidas = { id: 'm1', usuarioId: 'u1' };
      prisma.usuario.findUnique.mockResolvedValueOnce({
        id: 'u1',
        codigoAcesso: 'MC-ABC123',
        medidas,
      });

      await service.findByCodigoAcesso('MC-ABC123', '127.0.0.1', 'req-3');

      expect(auditLogService.registrar).toHaveBeenCalledWith({
        usuarioId: 'u1',
        acao: 'CONSULTA_PUBLICA',
        dadosDepois: expect.objectContaining({ codigo: 'MC-ABC123' }),
        ip: '127.0.0.1',
        requestId: 'req-3',
      });
    });

    it('não registra auditoria quando o código não é encontrado', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce(null);

      await expect(service.findByCodigoAcesso('MC-INEXISTENTE')).rejects.toThrow(NotFoundException);

      expect(auditLogService.registrar).not.toHaveBeenCalled();
    });
  });
});
