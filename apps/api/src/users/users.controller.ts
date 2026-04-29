import { Body, Controller, Delete, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { UsersService } from './users.service';

class DeleteAccountDto {
  @IsString() @MinLength(8) password!: string;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.findById(user.userId);
  }

  @Get('me/export')
  async export(@CurrentUser() user: AuthUser, @Res() res: Response) {
    const dump = await this.users.exportAccount(user.userId);
    const filename = `community-export-${user.userId}-${Date.now()}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(dump, null, 2));
  }

  @Delete('me')
  delete(@CurrentUser() user: AuthUser, @Body() dto: DeleteAccountDto) {
    return this.users.deleteAccount(user.userId, dto.password);
  }
}
