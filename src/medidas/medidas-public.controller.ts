import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MedidasService } from './medidas.service';

@ApiTags('medidas-publico')
@Controller('api/v1/medidas')
export class MedidasPublicController {
  constructor(private readonly medidasService: MedidasService) {}

  @Get(':codigo')
  @ApiOperation({
    summary: 'Consulta pública das medidas por código de acesso (sem autenticação)',
  })
  findByCodigo(@Param('codigo') codigo: string) {
    return this.medidasService.findByCodigoAcesso(codigo);
  }
}
