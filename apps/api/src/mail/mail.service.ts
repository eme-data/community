import { Injectable, Logger } from '@nestjs/common';

/**
 * Mail service. If SMTP_HOST is set we send a real email via nodemailer
 * (loaded lazily so the dep stays optional). Otherwise we log the message —
 * useful for dev/preview, and lets onboarding stay autonomous even when
 * email isn't wired yet (the verification link is printed in the API logs).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: any = null;
  private readonly enabled = !!process.env.SMTP_HOST;

  isEnabled() {
    return this.enabled;
  }

  async send(to: string, subject: string, html: string, text?: string): Promise<void> {
    if (!this.enabled) {
      this.logger.warn(
        `[mail-disabled] Would send to=${to} subject="${subject}" — set SMTP_HOST to enable real delivery.`,
      );
      this.logger.debug(text ?? html);
      return;
    }

    if (!this.transporter) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodemailer = require('nodemailer');
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
          : undefined,
      });
    }

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || `Community <no-reply@${process.env.APP_DOMAIN || 'localhost'}>`,
      to,
      subject,
      html,
      text,
    });
  }
}
