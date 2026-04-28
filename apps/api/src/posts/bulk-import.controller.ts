import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { PostsService } from './posts.service';

interface ImportRow {
  content: string;
  scheduledAt?: string;
  accountIds: string[];
  thread: string[];
}

/**
 * CSV format (comma-separated, semicolon-separated values inside cells):
 *   content,scheduled_at,account_ids,thread
 *   "Hello world",2026-05-01T10:00:00Z,acc_id1;acc_id2,
 *   "Multi-tweet thread",,acc_id_x,"Tweet 2|Tweet 3"
 *
 * - account_ids is a `;`-separated list of SocialAccount IDs in the tenant.
 * - thread is a `|`-separated list of additional tweets (X only).
 * - scheduled_at empty → DRAFT, else ISO datetime in UTC → SCHEDULED.
 */
@Controller('posts/bulk-import')
export class BulkImportController {
  constructor(private readonly posts: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'EDITOR')
  @UseInterceptors(FileInterceptor('file'))
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async upload(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    const text = file.buffer ? file.buffer.toString('utf-8') : '';
    if (!text) throw new BadRequestException('Empty file');

    const rows = parseCsv(text);
    if (rows.length === 0) throw new BadRequestException('No data rows found');

    let success = 0;
    const failures: { line: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        await this.posts.create(user.tenantId, user.userId, {
          content: row.content,
          accountIds: row.accountIds,
          scheduledAt: row.scheduledAt,
          thread: row.thread.length ? row.thread : undefined,
        } as any);
        success++;
      } catch (err: any) {
        failures.push({ line: i + 2, error: err.message ?? String(err) }); // +2 = header + 1-index
      }
    }

    return { total: rows.length, success, failureCount: failures.length, failures };
  }
}

function parseCsv(text: string): ImportRow[] {
  // Minimal RFC-4180-ish CSV parser: handles quoted cells and embedded commas.
  const lines = splitCsvRows(text.replace(/^﻿/, '')); // strip BOM
  if (lines.length === 0) return [];

  const header = parseCsvRow(lines[0]).map((c) => c.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const ci = idx('content');
  const ai = idx('account_ids');
  if (ci < 0 || ai < 0) {
    throw new BadRequestException('CSV must have at least "content" and "account_ids" columns');
  }
  const si = idx('scheduled_at');
  const ti = idx('thread');

  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw || !raw.trim()) continue;
    const cells = parseCsvRow(raw);
    const content = cells[ci]?.trim();
    const accountIds = (cells[ai] ?? '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!content || accountIds.length === 0) continue;
    rows.push({
      content,
      scheduledAt: si >= 0 ? cells[si]?.trim() || undefined : undefined,
      accountIds,
      thread:
        ti >= 0
          ? (cells[ti] ?? '')
              .split('|')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
    });
  }
  return rows;
}

function splitCsvRows(text: string): string[] {
  const rows: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      current += c;
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (current.length) rows.push(current);
      current = '';
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else {
      current += c;
    }
  }
  if (current.length) rows.push(current);
  return rows;
}

function parseCsvRow(row: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (c === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  cells.push(current);
  return cells;
}
