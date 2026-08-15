import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Maria' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @ApiProperty({ example: 'Silva' })
  @IsNotEmpty({ message: 'Sobrenome é obrigatório' })
  sobrenome: string;

  @ApiProperty({ example: 'maria.silva@example.com' })
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @ApiProperty({ example: 'senhaForte123' })
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @Matches(/\d/, { message: 'Senha deve conter ao menos um número' })
  senha: string;
}
