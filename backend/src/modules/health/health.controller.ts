import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { SkipThrottle } from '@nestjs/throttler';


@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
   @SkipThrottle()
  @ApiOperation({ summary: 'App aur database ki sehat check' })
  async check() {
    let dbStatus = 'down';
    try {
      // Database se ek simple query — agar chal gayi to DB zinda
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'up';
    } catch (e) {
      dbStatus = 'down';
    }

    return {
      status: dbStatus === 'up' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      uptime: Math.floor(process.uptime()), // app kitni der se chal rahi (seconds)
    };
  }
}