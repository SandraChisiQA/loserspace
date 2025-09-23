import { Module } from '@nestjs/common';
import { RootController } from './root.controller';
import { AuthModule } from './auth/auth.module';
import { PostsModule } from './posts/posts.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, PostsModule],
  controllers: [RootController],
  providers: [],
})
export class AppModule {}
