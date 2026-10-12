import { Module } from '@nestjs/common';
import { QueueWorkerModule } from '../queue-worker.module';
import { OrderProcessingService } from './order-processing.service';

@Module({
  imports: [QueueWorkerModule],
  providers: [OrderProcessingService],
})
export class OrderProcessingModule {}
