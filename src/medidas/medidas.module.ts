import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MedidasService } from './medidas.service';
import { MedidasController } from './medidas.controller';
import { MedidasPublicController } from './medidas-public.controller';

@Module({
  imports: [AuthModule],
  controllers: [MedidasController, MedidasPublicController],
  providers: [MedidasService],
})
export class MedidasModule {}
