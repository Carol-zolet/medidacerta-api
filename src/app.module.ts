import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import * as Joi from 'joi';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MedidasModule } from './medidas/medidas.module';
import { HealthModule } from './health/health.module';

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
export class AppModule {}
