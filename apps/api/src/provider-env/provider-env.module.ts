import { Global, Module } from '@nestjs/common';
import { ProviderEnvService } from './provider-env.service';
import { TenantProvidersController } from './tenant-providers.controller';
import { TenantProvidersService } from './tenant-providers.service';

@Global()
@Module({
  controllers: [TenantProvidersController],
  providers: [ProviderEnvService, TenantProvidersService],
  exports: [ProviderEnvService],
})
export class ProviderEnvModule {}
