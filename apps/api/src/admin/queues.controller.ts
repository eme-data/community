import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from './super-admin.guard';
import { QueuesService, QueueName } from './queues.service';

@Controller('admin/queues')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class QueuesController {
  constructor(private readonly queues: QueuesService) {}

  @Get()
  overview() {
    return this.queues.overview();
  }

  @Get(':name/failed')
  listFailed(@Param('name') name: QueueName, @Query('limit') limit?: string) {
    const n = Number(limit);
    return this.queues.listFailed(name, Number.isFinite(n) && n > 0 ? Math.min(n, 200) : 50);
  }

  @Post(':name/failed/:jobId/retry')
  retry(@Param('name') name: QueueName, @Param('jobId') jobId: string) {
    return this.queues.retry(name, jobId);
  }

  @Delete(':name/failed/:jobId')
  remove(@Param('name') name: QueueName, @Param('jobId') jobId: string) {
    return this.queues.remove(name, jobId);
  }
}
