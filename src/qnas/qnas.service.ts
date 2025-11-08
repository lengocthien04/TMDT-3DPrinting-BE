import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ERROR_MESSAGES } from '../common/constants/app.constants';
import { PrismaService } from '../database/prisma.service';

type CreateQnaPayload = {
  productId: string;
  question: string;
};

type AnswerQnaPayload = {
  answer: string;
};

@Injectable()
export class QnasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, payload: CreateQnaPayload) {
    const { productId, question } = payload;

    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException(ERROR_MESSAGES.PRODUCT.NOT_FOUND);
    }

    const qna = await this.prisma.qnA.create({
      data: {
        userId,
        productId,
        question,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return qna;
  }

  async findByProduct(productId: string) {
    if (!productId) {
      throw new BadRequestException(ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD);
    }

    const qnas = await this.prisma.qnA.findMany({
      where: { productId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return qnas;
  }

  async answer(qnaId: string, payload: AnswerQnaPayload, userRole?: UserRole) {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.QNA.PERMISSION_DENIED);
    }

    const { answer } = payload;

    const qna = await this.prisma.qnA.findUnique({
      where: { id: qnaId },
    });

    if (!qna) {
      throw new NotFoundException(ERROR_MESSAGES.QNA.NOT_FOUND);
    }

    const updated = await this.prisma.qnA.update({
      where: { id: qnaId },
      data: { answer },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return updated;
  }

  async delete(userId: string, qnaId: string) {
    const qna = await this.prisma.qnA.findUnique({
      where: { id: qnaId },
      select: { userId: true },
    });

    if (!qna) {
      throw new NotFoundException(ERROR_MESSAGES.QNA.NOT_FOUND);
    }

    // Only the question owner can delete
    if (qna.userId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.QNA.PERMISSION_DENIED);
    }

    await this.prisma.qnA.delete({
      where: { id: qnaId },
    });

    return { message: ERROR_MESSAGES.QNA.DELETED_SUCCESS };
  }
}
