import { DatabaseModule } from '@core/database/database.module';
import { Module } from '@nestjs/common';
import { ExampleCleanupService } from './example-cleanup/example-cleanup.service';
import { TestService } from './test/test.service';

@Module({
  imports: [DatabaseModule],
  providers: [ExampleCleanupService, TestService],
  exports: [ExampleCleanupService, TestService],
})
export class CronModule {}
