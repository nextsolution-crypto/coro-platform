import { Global, Module } from '@nestjs/common';
import { DemoCommunicationPolicyService } from './demo-communication-policy.service';

@Global()
@Module({
  providers: [DemoCommunicationPolicyService],
  exports: [DemoCommunicationPolicyService],
})
export class DemoEnvironmentModule {}
