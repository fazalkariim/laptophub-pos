import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContextModule } from './context/context.module';
import { TenantMiddleware } from './context/tenant.middleware';
import { BranchesModule } from './modules/branches/branches.module';
import { UsersModule } from './modules/users/users.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SalesModule } from './modules/sales/sales.module';
import { CustomersModule } from './modules/customers/customers.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { PurchasingModule } from './modules/purchasing/purchasing.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ReportsModule } from './modules/reports/reports.module';
import { HealthModule } from './modules/health/health.module';
import { CommonModule } from './common/common.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogInterceptor } from './common/audit/audit-log.interceptor';
import { AuditModule } from './modules/audit/audit.module';

@Module({
imports: [
    ConfigModule.forRoot({ isGlobal: true}),
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: 100 },
    ]),
    PrismaModule,
    AuthModule,
    ContextModule,
    BranchesModule,
    UsersModule,
    CatalogModule,
    InventoryModule,
    SalesModule,
    CustomersModule,
    TransfersModule,
    PurchasingModule,
    FinanceModule,
    ReportsModule,
    HealthModule,
    CommonModule,
    AuditModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}