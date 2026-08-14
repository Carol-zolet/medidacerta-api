import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { MedidasService } from './medidas.service';
import { UpsertMedidasDto } from './dto/upsert-medidas.dto';

@ApiTags('medidas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('medidas')
export class MedidasController {
  constructor(private readonly medidasService: MedidasService) {}

  @Post()
  @ApiOperation({
    summary:
      'Cria ou atualiza as medidas do usuário logado. Na primeira chamada gera o código de acesso.',
  })
  upsert(@CurrentUser() user: JwtPayloadUser, @Body() dto: UpsertMedidasDto) {
    return this.medidasService.upsertMinhasMedidas(user.sub, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Retorna as medidas do usuário logado' })
  findMe(@CurrentUser() user: JwtPayloadUser) {
    return this.medidasService.findMinhasMedidas(user.sub);
  }
}
