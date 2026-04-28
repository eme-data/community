import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @UseInterceptors(FileInterceptor('file'))
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  upload(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    return this.media.create(user.tenantId, file);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthUser) {
    return this.media.list(user.tenantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'EDITOR')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.media.remove(user.tenantId, id);
  }

  /**
   * Public file delivery — required so social providers (Meta/IG) can fetch
   * the media. Auth is intentionally bypassed; security comes from the
   * unguessable cuid id and HTTPS at the edge.
   */
  @Get(':id/raw')
  async raw(@Param('id') id: string, @Res() res: Response) {
    const m = await this.media.findPublic(id);
    if (!m) throw new NotFoundException();
    res.setHeader('Content-Type', m.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(this.media.absolutePath(m.storageKey));
  }
}
