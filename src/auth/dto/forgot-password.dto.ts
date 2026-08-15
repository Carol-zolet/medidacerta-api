import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'maria.silva@example.com' })
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;
}
