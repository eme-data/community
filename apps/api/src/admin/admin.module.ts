import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SuperAdminGuard } from './super-admin.guard';
import { QueuesController } from './queues.controller';
import { QueuesService } from './queues.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'post-publish' },
      { name: 'post-metrics' },
      { name: 'webhook-delivery' },
    ),
  ],
  controllers: [AdminController, QueuesController],
  providers: [AdminService, SuperAdminGuard, QueuesService],
  exports: [SuperAdminGuard],
})
export class AdminModule {}