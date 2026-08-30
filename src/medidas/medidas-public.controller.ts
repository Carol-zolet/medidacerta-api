import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
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
  findByCodigo(@Param('codigo') codigo: string, @Req() req: Request) {
    return this.medidasService.findByCodigoAcesso(codigo, req.ip, req.id);
  }
}
