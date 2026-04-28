import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.postTemplate.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const t = await this.prisma.postTemplate.findFirst({ where: { id, tenantId } });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  create(tenantId: string, userId: string, data: { name: string; content: string; thread?: string[] }) {
    return this.prisma.postTemplate.create({
      data: {
        tenantId,
        createdByUserId: userId,
        name: data.name,
        content: data.content,
        thread: data.thread ?? [],
      },
    });
  }

  async update(tenantId: string, id: string, data: { name?: string; content?: string; thread?: string[] }) {
    await this.findOne(tenantId, id);
    return this.prisma.postTemplate.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.thread !== undefined && { thread: data.thread }),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.postTemplate.delete({ where: { id } });
    return { ok: true };
  }
}
