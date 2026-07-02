import { Module, Global } from '@nestjs/common';
import { PlanLimitService } from './services/plan-limit.service';

@Global()  // taake har jagah available ho bina import kiye
@Module({
  providers: [PlanLimitService],
  exports: [PlanLimitService],
})
export class CommonModule {}