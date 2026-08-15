import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora
const MENSAGEM_GENERICA_FORGOT_PASSWORD =
  'Se o e-mail informado estiver cadastrado, você receberá instruções para redefinir sua senha.';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existente = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    if (existente) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const senhaHash = await bcrypt.hash(dto.senha, SALT_ROUNDS);

    const usuario = await this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        sobrenome: dto.sobrenome,
        email: dto.email,
        senhaHash,
      },
    });

    return {
      id: usuario.id,
      nome: usuario.nome,
      sobrenome: usuario.sobrenome,
      email: usuario.email,
    };
  }

  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const senhaValida = await bcrypt.compare(dto.senha, usuario.senhaHash);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = { sub: usuario.id, email: usuario.email };
    const access_token = await this.jwtService.signAsync(payload);

    return { access_token };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    if (usuario) {
      const resetToken = randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await this.prisma.usuario.update({
        where: { id: usuario.id },
        data: { resetToken, resetTokenExpires },
      });

      // Simula o envio de e-mail: neste MVP acadêmico não há serviço de e-mail configurado.
      // eslint-disable-next-line no-console
      console.log(
        `[forgot-password] Token de reset para ${usuario.email}: ${resetToken} (expira em ${resetTokenExpires.toISOString()})`,
      );
    }

    // Resposta sempre idêntica, exista ou não o e-mail, para evitar enumeration attack.
    return { message: MENSAGEM_GENERICA_FORGOT_PASSWORD };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { resetToken: dto.token },
    });

    if (!usuario || !usuario.resetTokenExpires) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    if (usuario.resetTokenExpires.getTime() < Date.now()) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    const senhaHash = await bcrypt.hash(dto.novaSenha, SALT_ROUNDS);

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senhaHash,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return { message: 'Senha redefinida com sucesso' };
  }
}
