import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationInput {
  tenantId: string;
  /** null/undefined ⇒ tenant-wide (delivered to all members). */
  userId?: string | null;
  type: string;
  title: string;
  body?: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Fire-and-forget — failures are logged but never propagate. */
  async create(n: NotificationInput): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          tenantId: n.tenantId,
          userId: n.userId ?? null,
          type: n.type,
          title: n.title,
          body: n.body,
          link: n.link,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Notification create failed (${n.type}): ${err?.message ?? err}`);
    }
  }

  /** Notify every OWNER/ADMIN of the tenant — used for approval requests, failures. */
  async notifyAdmins(tenantId: string, n: Omit<NotificationInput, 'tenantId' | 'userId'>) {
    const admins = await this.prisma.membership.findMany({
      where: { tenantId, role: { in: ['OWNER', 'ADMIN'] } },
      select: { userId: true },
    });
    await Promise.all(
      admins.map((a) =>
        this.create({ ...n, tenantId, userId: a.userId }),
      ),
    );
  }

  list(tenantId: string, userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}) {
    return this.prisma.notification.findMany({
      where: {
        tenantId,
        OR: [{ userId }, { userId: null }],
        readAt: opts.unreadOnly ? null : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(opts.limit ?? 50, 200),
    });
  }

  async unreadCount(tenantId: string, userId: string) {
    return this.prisma.notification.count({
      where: {
        tenantId,
        readAt: null,
        OR: [{ userId }, { userId: null }],
      },
    });
  }

  async markRead(tenantId: string, userId: string, id: string) {
    const n = await this.prisma.notification.findFirst({
      where: {
        id,
        tenantId,
        OR: [{ userId }, { userId: null }],
      },
    });
    if (!n) throw new NotFoundException('Notification not found');
    if (n.readAt) return n;
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(tenantId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        tenantId,
        readAt: null,
        OR: [{ userId }, { userId: null }],
      },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
