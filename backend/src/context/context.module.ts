import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';

@Global() // poori app mein available
@Module({
  providers: [TenantContextService],
  exports: [TenantContextService],
})
export class ContextModule {}