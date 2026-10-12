import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CognitoService } from './cognito/cognito.service';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [HttpModule],
  providers: [RolesGuard, AuthGuard, CognitoService],
  exports: [RolesGuard, AuthGuard, CognitoService],
})
export class AuthModule {}
