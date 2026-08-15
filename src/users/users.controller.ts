import {
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Retorna os dados do usuário autenticado' })
  findMe(@CurrentUser() user: JwtPayloadUser) {
    return this.usersService.findMe(user.sub);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Exclui o usuário autenticado e suas medidas' })
  remove(@CurrentUser() user: JwtPayloadUser, @Req() req: Request) {
    return this.usersService.remove(user.sub, req.ip);
  }
}
