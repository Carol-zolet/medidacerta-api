import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

// Limites antropométricos plausíveis por campo (não é Z-score: cada medida é
// isolada por usuário, não há base histórica de outros usuários para calcular
// média/desvio padrão). Serve só para pegar erro grosseiro de digitação
// (ex: cintura = 300cm), não para validar proporção corporal.
export class UpsertMedidasDto {
  @ApiProperty({ example: 90.5 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Busto deve ser numérico' })
  @Min(50, { message: 'Busto deve estar entre 50 e 200 cm' })
  @Max(200, { message: 'Busto deve estar entre 50 e 200 cm' })
  busto: number;

  @ApiProperty({ example: 85.0 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Tórax deve ser numérico' })
  @Min(50, { message: 'Tórax deve estar entre 50 e 200 cm' })
  @Max(200, { message: 'Tórax deve estar entre 50 e 200 cm' })
  torax: number;

  @ApiProperty({ example: 70.0 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Cintura deve ser numérica' })
  @Min(40, { message: 'Cintura deve estar entre 40 e 200 cm' })
  @Max(200, { message: 'Cintura deve estar entre 40 e 200 cm' })
  cintura: number;

  @ApiProperty({ example: 95.0 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Quadril deve ser numérico' })
  @Min(50, { message: 'Quadril deve estar entre 50 e 200 cm' })
  @Max(200, { message: 'Quadril deve estar entre 50 e 200 cm' })
  quadril: number;

  @ApiProperty({ example: 55.0 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Coxa deve ser numérica' })
  @Min(20, { message: 'Coxa deve estar entre 20 e 100 cm' })
  @Max(100, { message: 'Coxa deve estar entre 20 e 100 cm' })
  coxa: number;

  @ApiProperty({ example: 38.5 })
  @IsNumber({ maxDecimalPlaces: 1 }, { message: 'Número do calçado deve ser numérico' })
  @Min(15, { message: 'Número do calçado deve estar entre 15 e 55' })
  @Max(55, { message: 'Número do calçado deve estar entre 15 e 55' })
  numero_calcado: number;
}
