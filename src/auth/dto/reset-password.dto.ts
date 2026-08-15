import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'a1b2c3d4e5f6...' })
  @IsNotEmpty({ message: 'Token é obrigatório' })
  token: string;

  @ApiProperty({ example: 'novaSenhaForte123' })
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  novaSenha: string;
}
