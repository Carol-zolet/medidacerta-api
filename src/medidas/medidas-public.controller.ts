import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MedidasService } from './medidas.service';

@ApiTags('medidas-publico')
@Controller('api/v1/medidas')
export class MedidasPublicController {
  constructor(private readonly medidasService: MedidasService) {}

  @Get(':codigo')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Consulta pública das medidas por código de acesso (sem autenticação). Limite: 20 requisições/minuto por IP.',
  })
  findByCodigo(@Param('codigo') codigo: string) {
    return this.medidasService.findByCodigoAcesso(codigo);
  }
}
