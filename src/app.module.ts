import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import * as Joi from 'joi';
import { PrismaModule } from './prisma/prisma.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MedidasModule } from './medidas/medidas.module';
import { HealthModule } from './health/health.module';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string()
          .pattern(/^postgres(ql)?:\/\//)
          .required()
          .messages({
            'string.empty': 'DATABASE_URL é obrigatória',
            'any.required': 'DATABASE_URL é obrigatória',
            'string.pattern.base':
              'DATABASE_URL deve ser uma string de conexão PostgreSQL válida (postgres://...)',
          }),
        JWT_SECRET: Joi.string().min(1).required().messages({
          'string.empty': 'JWT_SECRET é obrigatória',
          'any.required': 'JWT_SECRET é obrigatória',
        }),
        JWT_EXPIRES_IN: Joi.string().default('7d'),
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
      }),
      validationOptions: {
        abortEarly: false,
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 60,
      },
    ]),
    PrismaModule,
    AuditLogModule,
    AuthModule,
    UsersModule,
    MedidasModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Aplicado via NestModule (não só em main.ts) pra também valer nos testes
    // e2e, que constroem o app a partir do AppModule sem passar pelo bootstrap.
    consumer.apply(requestIdMiddleware).forRoutes('*');
  }
}
