import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEvent {
  tenantId: string;
  userId?: string;
  action: string;
  target?: string;
  payload?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Fire-and-forget log. Failures never propagate to the caller. */
  async log(event: AuditEvent): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: event.tenantId,
          userId: event.userId,
          action: event.action,
          target: event.target,
          payload: event.payload as any,
          ip: event.ip,
          userAgent: event.userAgent,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Audit log failed for ${event.action}: ${err?.message ?? err}`);
    }
  }

  list(tenantId: string, limit = 200) {
    return this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
    });
  }
}
