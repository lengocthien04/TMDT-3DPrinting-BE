import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ERROR_MESSAGES } from '../common/constants/app.constants';
import { PrismaService } from '../database/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto) {
    const { productId, rating, comment } = dto;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) throw new NotFoundException(ERROR_MESSAGES.PRODUCT.NOT_FOUND);

    const review = await this.prisma.review.create({
      data: {
        userId,
        productId,
        rating,
        comment,
      },
    });

    return review;
  }

  async findByProduct(productId: string) {
    if (!productId) {
      throw new BadRequestException(ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD);
    }

    const reviews = await this.prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: { select: { id: true, username: true } },
      },
    });

    return reviews;
  }

  async update(
    userId: string,
    reviewId: string,
    dto: UpdateReviewDto,
    userRole?: UserRole,
  ) {
    const existing = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existing) throw new NotFoundException(ERROR_MESSAGES.REVIEW.NOT_FOUND);

    // Allow owner or admin
    if (existing.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.REVIEW.PERMISSION_DENIED);
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: dto.rating ?? existing.rating,
        comment: dto.comment ?? existing.comment,
      },
    });

    return updated;
  }

  async delete(userId: string, reviewId: string, userRole?: UserRole) {
    const existing = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES.REVIEW.NOT_FOUND);
    }

    if (existing.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.REVIEW.PERMISSION_DENIED);
    }

    await this.prisma.review.delete({ where: { id: reviewId } });

    return { message: ERROR_MESSAGES.REVIEW.DELETED_SUCCESS };
  }
}
