import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { JwtOrApiKeyAuthGuard } from '../auth/jwt-or-apikey.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';

class RejectDto {
  @IsOptional() @IsString() reason?: string;
}

@Controller('posts')
@UseGuards(JwtOrApiKeyAuthGuard)
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.posts.list(user.tenantId);
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  listPending(@CurrentUser() user: AuthUser) {
    return this.posts.listPending(user.tenantId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.posts.findOne(user.tenantId, id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'EDITOR')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePostDto) {
    return this.posts.create(user.tenantId, user.userId, dto);
  }

  @Post(':id/publish')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'EDITOR')
  publishNow(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.posts.publishNow(user.tenantId, id);
  }

  @Delete(':id/schedule')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'EDITOR')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.posts.cancel(user.tenantId, id);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.posts.approve(user.tenantId, user.userId, id);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RejectDto) {
    return this.posts.reject(user.tenantId, user.userId, id, dto.reason);
  }
}
