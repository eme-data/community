import { Body, Controller, Delete, Get, UseGuards } from '@nestjs/common';
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

  @Delete('me')
  delete(@CurrentUser() user: AuthUser, @Body() dto: DeleteAccountDto) {
    return this.users.deleteAccount(user.userId, dto.password);
  }
}
