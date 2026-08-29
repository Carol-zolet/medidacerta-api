import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MedidasService } from './medidas.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MedidasService', () => {
  let service: MedidasService;
  let prisma: {
    usuario: { findUnique: jest.Mock; update: jest.Mock };
    medida: { upsert: jest.Mock; findUnique: jest.Mock };
  };

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

    const moduleRef = await Test.createTestingModule({
      providers: [MedidasService, { provide: PrismaService, useValue: prisma }],
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
  });
});
