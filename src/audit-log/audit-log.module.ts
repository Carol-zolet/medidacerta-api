import { Global, Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';

// Global: qualquer service pode injetar AuditLogService sem precisar importar
// este módulo explicitamente (mesmo padrão do PrismaModule). Propositalmente
// sem controller — não há rota de leitura da trilha de auditoria.
@Global()
@Module({
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
