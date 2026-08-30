import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';

// Global: qualquer service pode injetar AuditLogService sem precisar importar
// este módulo explicitamente (mesmo padrão do PrismaModule). O único ponto de
// leitura é GET /audit-log/me (resumo amigável, próprio usuário) — a tabela
// audit_log em si continua sem endpoint de leitura genérico.
@Global()
@Module({
  imports: [AuthModule],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
