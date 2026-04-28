import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { extname, resolve } from 'path';
import { randomBytes } from 'crypto';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR || '/app/uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const id = randomBytes(12).toString('hex');
          cb(null, `${id}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
      fileFilter: (_req, file, cb) => {
        if (/^(image|video)\//.test(file.mimetype)) cb(null, true);
        else cb(new Error('Only image/* and video/* are accepted'), false);
      },
    }),
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {
  static UPLOAD_DIR = UPLOAD_DIR;
}
