import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.audit.list(user.tenantId);
  }

  @Get('export.csv')
  async exportCsv(@CurrentUser() user: AuthUser, @Res() res: Response) {
    const entries = await this.audit.list(user.tenantId, 5000);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-${user.tenantId}-${Date.now()}.csv"`);
    res.write('createdAt,action,userId,target,ip,payload\n');
    for (const e of entries) {
      const cells = [
        e.createdAt.toISOString(),
        e.action,
        e.userId ?? '',
        e.target ?? '',
        e.ip ?? '',
        e.payload ? JSON.stringify(e.payload) : '',
      ].map(csvEscape);
      res.write(cells.join(',') + '\n');
    }
    res.end();
  }
}

function csvEscape(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
