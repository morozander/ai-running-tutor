import { Module } from '@nestjs/common';
import { QueueWorkerModule } from '../queue-worker.module';
import { EmailNotificationService } from './email-notification.service';

@Module({
  imports: [QueueWorkerModule],
  providers: [EmailNotificationService],
})
export class EmailNotificationModule {}
