// filepath: c:\Users\IRVENE KWAMBANA\Desktop\loserspace\losers\backend\src\posts\posts.module.ts
import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [PostsService, PrismaService],
  exports: [PostsService],
})
export class PostsModule {}