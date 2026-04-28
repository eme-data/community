import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.posts.list(user.tenantId);
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
}
