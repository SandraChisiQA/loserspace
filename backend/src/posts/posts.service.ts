import { Injectable, InternalServerErrorException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}
  async createPost(createPostDto: CreatePostDto, authorId: string) {
    try {
      return await this.prisma.post.create({
        data: { ...createPostDto, authorId },
        include: {
          author: { select: { id: true, username: true, nickname: true } },
          _count: { select: { comments: true, votes: true } },
        },
      });
    } catch (error) {
      console.error('Error creating post:', error);
      throw new InternalServerErrorException('Failed to create post');
    }
  }

  async getPosts(category?: string, userId?: string) {
    try {
      const posts = await this.prisma.post.findMany({
        where: category ? { category: category as any } : undefined,
        include: {
          author: { select: { id: true, username: true, nickname: true } },
          _count: { select: { comments: true } },
          votes: { select: { isUpvote: true, userId: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return posts.map(post => {
        const upvotes = post.votes.filter(vote => vote.isUpvote).length;
        const downvotes = post.votes.filter(vote => !vote.isUpvote).length;
        const netVotes = upvotes - downvotes;
        const userVote = userId ? post.votes.find(vote => vote.userId === userId)?.isUpvote : undefined;
        return {
          ...post,
          _count: { ...post._count, votes: netVotes },
          userVote,
        };
      });
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw new InternalServerErrorException('Failed to fetch posts');
    }
  }

  async getPostById(postId: string, userId?: string) {
    try {
      const post = await this.prisma.post.findUniqueOrThrow({
        where: { id: postId },
        include: {
          author: { select: { id: true, username: true, nickname: true } },
          votes: { select: { isUpvote: true, userId: true } },
          comments: {
            include: { author: { select: { id: true, username: true, nickname: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      const upvotes = post.votes.filter(vote => vote.isUpvote).length;
      const downvotes = post.votes.filter(vote => !vote.isUpvote).length;
      const netVotes = upvotes - downvotes;
      const userVote = userId ? post.votes.find(vote => vote.userId === userId)?.isUpvote : undefined;

      return { ...post, netVotes, userVote };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Post not found');
      }
      console.error('Error fetching post by ID:', error);
      throw new InternalServerErrorException('Failed to fetch post');
    }
  }

  async deletePost(postId: string, userId: string) {
    try {
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true },
      });

      if (!post) throw new NotFoundException('Post not found');
      if (post.authorId !== userId) throw new ForbiddenException('You can only delete your own posts');

      await this.prisma.post.delete({ where: { id: postId } });
      return { message: 'Post deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      console.error('Error deleting post:', error);
      throw new InternalServerErrorException('Failed to delete post');
    }
  }

  async createComment(postId: string, createCommentDto: CreateCommentDto, authorId: string) {
    try {
      const post = await this.prisma.post.findUnique({ where: { id: postId } });
      if (!post) throw new NotFoundException('Post not found');

      return await this.prisma.comment.create({
        data: { content: createCommentDto.content, postId, authorId },
        include: { author: { select: { id: true, username: true, nickname: true } } },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error creating comment:', error);
      throw new InternalServerErrorException('Failed to create comment');
    }
  }

  async getComments(postId: string) {
    try {
      const post = await this.prisma.post.findUnique({ where: { id: postId } });
      if (!post) throw new NotFoundException('Post not found');

      return await this.prisma.comment.findMany({
        where: { postId },
        include: { author: { select: { id: true, username: true, nickname: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error fetching comments:', error);
      throw new InternalServerErrorException('Failed to fetch comments');
    }
  }

  async votePost(postId: string, userId: string, isUpvote: boolean) {
    try {
      const post = await this.prisma.post.findUnique({ where: { id: postId } });
      if (!post) throw new NotFoundException('Post not found');

      const existingVote = await this.prisma.vote.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (existingVote) {
        if (existingVote.isUpvote === isUpvote) {
          await this.prisma.vote.delete({ where: { id: existingVote.id } });
        } else {
          await this.prisma.vote.update({ where: { id: existingVote.id }, data: { isUpvote } });
        }
      } else {
        await this.prisma.vote.create({ data: { userId, postId, isUpvote } });
      }

      const upvotes = await this.prisma.vote.count({ where: { postId, isUpvote: true } });
      const downvotes = await this.prisma.vote.count({ where: { postId, isUpvote: false } });
      const netVotes = upvotes - downvotes;
      const updatedVote = await this.prisma.vote.findUnique({ where: { userId_postId: { userId, postId } } });

      return { netVotes, upvotes, downvotes, userVote: updatedVote?.isUpvote ?? null };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error voting on post:', error);
      throw new InternalServerErrorException('Failed to vote on post');
    }
  }
}