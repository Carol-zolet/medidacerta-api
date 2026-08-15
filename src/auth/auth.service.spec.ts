import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    usuario: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    prisma = {
      usuario: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    jwtService = { signAsync: jest.fn().mockResolvedValue('fake.jwt.token') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('registra um novo usuário com sucesso', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce(null);
      prisma.usuario.create.mockResolvedValueOnce({
        id: 'u1',
        nome: 'Maria',
        sobrenome: 'Silva',
        email: 'maria@example.com',
      });

      const resultado = await service.register({
        nome: 'Maria',
        sobrenome: 'Silva',
        email: 'maria@example.com',
        senha: 'senha123',
      });

      expect(resultado.email).toBe('maria@example.com');
      expect(prisma.usuario.create).toHaveBeenCalledTimes(1);
    });

    it('lança ConflictException (409) ao registrar e-mail já cadastrado', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce({ id: 'u1', email: 'maria@example.com' });

      await expect(
        service.register({
          nome: 'Maria',
          sobrenome: 'Silva',
          email: 'maria@example.com',
          senha: 'senha123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('autentica com sucesso e retorna um access_token', async () => {
      const senhaHash = await bcrypt.hash('senha123', 10);
      prisma.usuario.findUnique.mockResolvedValueOnce({
        id: 'u1',
        email: 'maria@example.com',
        senhaHash,
      });

      const resultado = await service.login({ email: 'maria@example.com', senha: 'senha123' });

      expect(resultado.access_token).toBe('fake.jwt.token');
    });

    it('lança UnauthorizedException (401) com senha incorreta', async () => {
      const senhaHash = await bcrypt.hash('senha123', 10);
      prisma.usuario.findUnique.mockResolvedValueOnce({
        id: 'u1',
        email: 'maria@example.com',
        senhaHash,
      });

      await expect(
        service.login({ email: 'maria@example.com', senha: 'senhaErrada' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException (401) para e-mail inexistente', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'naoexiste@example.com', senha: 'qualquer123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('nunca loga a senha em texto puro numa tentativa de login falha', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      const senhaSecreta = 'senhaSuperSecreta123';

      const senhaHash = await bcrypt.hash('outraSenhaQualquer1', 10);
      prisma.usuario.findUnique.mockResolvedValueOnce({
        id: 'u1',
        email: 'maria@example.com',
        senhaHash,
      });

      await expect(
        service.login({ email: 'maria@example.com', senha: senhaSecreta }, '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);

      expect(warnSpy).toHaveBeenCalled();
      const mensagensLogadas = warnSpy.mock.calls.map((chamada) => String(chamada[0]));
      for (const mensagem of mensagensLogadas) {
        expect(mensagem).not.toContain(senhaSecreta);
      }

      warnSpy.mockRestore();
    });
  });

  describe('forgotPassword', () => {
    it('retorna a mesma mensagem genérica exista ou não o e-mail', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce(null);
      const semUsuario = await service.forgotPassword({ email: 'naoexiste@example.com' });

      prisma.usuario.findUnique.mockResolvedValueOnce({ id: 'u1', email: 'maria@example.com' });
      prisma.usuario.update.mockResolvedValueOnce({});
      const comUsuario = await service.forgotPassword({ email: 'maria@example.com' });

      expect(semUsuario.message).toBe(comUsuario.message);
    });
  });

  describe('resetPassword', () => {
    it('lança BadRequestException (400) com token inválido', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.resetPassword({ token: 'token-invalido', novaSenha: 'novaSenha123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException (400) com token expirado', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce({
        id: 'u1',
        resetToken: 'token-expirado',
        resetTokenExpires: new Date(Date.now() - 1000),
      });

      await expect(
        service.resetPassword({ token: 'token-expirado', novaSenha: 'novaSenha123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('redefine a senha com um token válido', async () => {
      prisma.usuario.findUnique.mockResolvedValueOnce({
        id: 'u1',
        resetToken: 'token-valido',
        resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
      });
      prisma.usuario.update.mockResolvedValueOnce({});

      const resultado = await service.resetPassword({
        token: 'token-valido',
        novaSenha: 'novaSenha123',
      });

      expect(resultado.message).toBe('Senha redefinida com sucesso');
      expect(prisma.usuario.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: expect.objectContaining({ resetToken: null, resetTokenExpires: null }),
      });
    });
  });
});
