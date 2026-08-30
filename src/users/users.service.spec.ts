import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    usuario: { findUnique: jest.Mock; delete: jest.Mock };
  };
  let auditLogService: { registrar: jest.Mock };

  beforeEach(async () => {
    prisma = {
      usuario: { findUnique: jest.fn(), delete: jest.fn() },
    };
    auditLogService = { registrar: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  describe('findMe', () => {
    it('retorna o usuário quando encontrado', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce({
        id: 'u1',
        nome: 'Maria',
        sobrenome: 'Silva',
        email: 'maria@example.com',
        senhaHash: 'hash-nao-deve-vazar',
        codigoAcesso: 'MC-ABC123',
      });

      const resultado = await service.findMe('u1');

      expect(resultado.id).toBe('u1');
      expect(resultado.email).toBe('maria@example.com');
    });

    it('lança NotFoundException (404) quando o usuário não existe', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce(null);

      await expect(service.findMe('inexistente')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('exclui o usuário e retorna mensagem de sucesso', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce({
        id: 'u1',
        nome: 'Maria',
        sobrenome: 'Silva',
        email: 'maria@example.com',
        codigoAcesso: 'MC-ABC123',
        createdAt: new Date('2026-01-01'),
        medidas: { id: 'm1', busto: 90 },
      });
      prisma.usuario.delete.mockResolvedValueOnce({});

      const resultado = await service.remove('u1', '127.0.0.1', 'req-1');

      expect(resultado).toEqual({ message: 'Usuário removido com sucesso' });
      expect(prisma.usuario.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
    });

    it('registra auditoria DELETE_CONTA com o snapshot final antes de apagar', async () => {
      const usuarioFinal = {
        id: 'u1',
        nome: 'Maria',
        sobrenome: 'Silva',
        email: 'maria@example.com',
        senhaHash: 'nao-deve-ir-pra-auditoria',
        resetToken: 'nao-deve-ir-pra-auditoria',
        resetTokenExpires: null,
        codigoAcesso: 'MC-ABC123',
        createdAt: new Date('2026-01-01'),
        medidas: { id: 'm1', busto: 90 },
      };
      prisma.usuario.findUnique.mockResolvedValueOnce(usuarioFinal);
      prisma.usuario.delete.mockResolvedValueOnce({});

      await service.remove('u1', '127.0.0.1', 'req-1');

      expect(auditLogService.registrar).toHaveBeenCalledWith({
        usuarioId: 'u1',
        acao: 'DELETE_CONTA',
        dadosAntes: {
          nome: 'Maria',
          sobrenome: 'Silva',
          email: 'maria@example.com',
          codigoAcesso: 'MC-ABC123',
          createdAt: usuarioFinal.createdAt,
          medidas: usuarioFinal.medidas,
        },
        dadosDepois: null,
        ip: '127.0.0.1',
        requestId: 'req-1',
      });

      // Confirma que campos sensíveis não vazam para o registro de auditoria.
      const argumentoRegistrado = auditLogService.registrar.mock.calls[0][0];
      expect(argumentoRegistrado.dadosAntes).not.toHaveProperty('senhaHash');
      expect(argumentoRegistrado.dadosAntes).not.toHaveProperty('resetToken');
      expect(argumentoRegistrado.dadosAntes).not.toHaveProperty('resetTokenExpires');
    });

    it('não registra auditoria se o usuário já não existir mais', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce(null);
      prisma.usuario.delete.mockResolvedValueOnce({});

      await service.remove('inexistente');

      expect(auditLogService.registrar).not.toHaveBeenCalled();
    });
  });
});
