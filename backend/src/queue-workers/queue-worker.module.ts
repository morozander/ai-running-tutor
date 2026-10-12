import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import sqsConfig from '../config/sqs.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.AWS_LAMBDA_FUNCTION_NAME ? [] : ['.env', '.env.local'],
      load: [sqsConfig],
    }),
  ],
})
export class QueueWorkerModule {}
