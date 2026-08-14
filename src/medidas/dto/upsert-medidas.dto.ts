import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class UpsertMedidasDto {
  @ApiProperty({ example: 90.5 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Busto deve ser numérico' })
  @IsPositive({ message: 'Busto deve ser positivo' })
  busto: number;

  @ApiProperty({ example: 85.0 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Tórax deve ser numérico' })
  @IsPositive({ message: 'Tórax deve ser positivo' })
  torax: number;

  @ApiProperty({ example: 70.0 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Cintura deve ser numérica' })
  @IsPositive({ message: 'Cintura deve ser positiva' })
  cintura: number;

  @ApiProperty({ example: 95.0 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Quadril deve ser numérico' })
  @IsPositive({ message: 'Quadril deve ser positivo' })
  quadril: number;

  @ApiProperty({ example: 55.0 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Coxa deve ser numérica' })
  @IsPositive({ message: 'Coxa deve ser positiva' })
  coxa: number;

  @ApiProperty({ example: 38.5 })
  @IsNumber({ maxDecimalPlaces: 1 }, { message: 'Número do calçado deve ser numérico' })
  @IsPositive({ message: 'Número do calçado deve ser positivo' })
  numero_calcado: number;
}
