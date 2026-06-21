import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // poori app mein PrismaService available, baar baar import nahi karna
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // doosre modules ise use kar sakein
})
export class PrismaModule {}