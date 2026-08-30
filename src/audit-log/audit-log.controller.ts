import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { AuditLogService } from './audit-log.service';

@ApiTags('audit-log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('me')
  @ApiOperation({
    summary:
      'Histórico resumido de auditoria do usuário logado (últimos 50 eventos): consultas ' +
      'públicas ao seu código de acesso e alterações nas suas medidas. Nunca expõe dados ' +
      'brutos, só um resumo amigável.',
  })
  minhasAuditorias(@CurrentUser() user: JwtPayloadUser) {
    return this.auditLogService.listarMinhasUltimas(user.sub);
  }
}
