import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { encrypt, decrypt } from '../social/crypto.util';

const BACKUP_CODE_COUNT = 10;

@Injectable()
export class TwoFactorService {
  constructor(private readonly prisma: PrismaService) {}

  async beginSetup(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    if (user.totpEnabledAt) throw new ConflictException('2FA is already enabled');

    const secret = authenticator.generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: encrypt(secret) },
    });

    const issuer = process.env.APP_DOMAIN || 'Community';
    const otpauth = authenticator.keyuri(user.email, issuer, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);
    return { otpauth, qrDataUrl };
  }

  /**
   * Confirm setup. Returns 10 freshly generated, single-use backup codes — the
   * client must show them to the user IMMEDIATELY since they're never sent again.
   */
  async confirmSetup(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret) throw new BadRequestException('No pending 2FA setup');
    if (user.totpEnabledAt) throw new ConflictException('2FA is already enabled');

    const secret = decrypt(user.totpSecret);
    if (!authenticator.check(code, secret)) {
      throw new BadRequestException('Invalid code');
    }
    const codes = await this.regenerateBackupCodes(userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabledAt: new Date() },
    });
    return { ok: true, backupCodes: codes };
  }

  /** Regenerate a fresh set of backup codes — invalidates all existing ones. */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();

    const codes = Array.from({ length: BACKUP_CODE_COUNT }, () =>
      randomBytes(5).toString('hex').match(/.{1,5}/g)!.join('-'),
    );

    await this.prisma.$transaction([
      this.prisma.backupCode.deleteMany({ where: { userId } }),
      this.prisma.backupCode.createMany({
        data: codes.map((c) => ({
          userId,
          codeHash: createHash('sha256').update(c).digest('hex'),
        })),
      }),
    ]);
    return codes;
  }

  async disable(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpEnabledAt || !user.totpSecret) {
      throw new BadRequestException('2FA is not enabled');
    }
    const secret = decrypt(user.totpSecret);
    if (!authenticator.check(code, secret) && !(await this.consumeBackupCode(userId, code))) {
      throw new BadRequestException('Invalid code');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { totpSecret: null, totpEnabledAt: null },
      }),
      this.prisma.backupCode.deleteMany({ where: { userId } }),
    ]);
    return { ok: true };
  }

  /** Verify either a TOTP code or a single-use backup code. */
  async verifyForLogin(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpEnabledAt || !user.totpSecret) {
      throw new BadRequestException('2FA is not enabled for this account');
    }
    const secret = decrypt(user.totpSecret);
    if (authenticator.check(code, secret)) return;
    if (await this.consumeBackupCode(userId, code)) return;
    throw new BadRequestException('Invalid 2FA code');
  }

  /** Returns true if the code matched and was just consumed. */
  private async consumeBackupCode(userId: string, raw: string): Promise<boolean> {
    const normalised = raw.trim().toLowerCase().replace(/\s+/g, '');
    const codeHash = createHash('sha256').update(normalised).digest('hex');
    const record = await this.prisma.backupCode.findUnique({ where: { codeHash } });
    if (!record || record.userId !== userId || record.consumedAt) return false;
    await this.prisma.backupCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    return true;
  }
}
