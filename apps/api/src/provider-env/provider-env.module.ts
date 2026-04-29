import { Global, Module } from '@nestjs/common';
import { ProviderEnvService } from './provider-env.service';

@Global()
@Module({
  providers: [ProviderEnvService],
  exports: [ProviderEnvService],
})
export class ProviderEnvModule {}