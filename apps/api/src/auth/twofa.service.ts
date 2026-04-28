import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { encrypt, decrypt } from '../social/crypto.util';

@Injectable()
export class TwoFactorService {
  constructor(private readonly prisma: PrismaService) {}

  /** Begin enrollment — returns the otpauth URL and a base64 PNG QR code. */
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

  /** Confirm setup with the first valid code from the authenticator app. */
  async confirmSetup(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret) throw new BadRequestException('No pending 2FA setup');
    if (user.totpEnabledAt) throw new ConflictException('2FA is already enabled');

    const secret = decrypt(user.totpSecret);
    if (!authenticator.check(code, secret)) {
      throw new BadRequestException('Invalid code');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabledAt: new Date() },
    });
    return { ok: true };
  }

  /** Disable 2FA — caller must provide a valid code as proof. */
  async disable(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpEnabledAt || !user.totpSecret) {
      throw new BadRequestException('2FA is not enabled');
    }
    const secret = decrypt(user.totpSecret);
    if (!authenticator.check(code, secret)) {
      throw new BadRequestException('Invalid code');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: null, totpEnabledAt: null },
    });
    return { ok: true };
  }

  /** Verify a code during login. Throws if invalid. */
  async verifyForLogin(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpEnabledAt || !user.totpSecret) {
      throw new BadRequestException('2FA is not enabled for this account');
    }
    const secret = decrypt(user.totpSecret);
    if (!authenticator.check(code, secret)) {
      throw new BadRequestException('Invalid 2FA code');
    }
  }

  isEnabled(user: { totpEnabledAt: Date | null }): boolean {
    return !!user.totpEnabledAt;
  }
}
