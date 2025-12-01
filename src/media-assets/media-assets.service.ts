import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ERROR_MESSAGES } from '../common/constants/app.constants';
import { PrismaService } from '../database/prisma.service';

type CreateMediaPayload = {
  productId: string;
  url: string;
  type: string;
  altText?: string | null;
};

type UpdateMediaPayload = Partial<
  Pick<CreateMediaPayload, 'url' | 'type' | 'altText'>
>;

@Injectable()
export class MediaAssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateMediaPayload, userRole?: UserRole) {
    const { productId, url, type, altText } = payload;

    if (!url || !type) {
      throw new BadRequestException(ERROR_MESSAGES.MEDIA.INVALID_PAYLOAD);
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException(ERROR_MESSAGES.PRODUCT.NOT_FOUND);

    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.MEDIA.PERMISSION_DENIED);
    }

    const media = await this.prisma.mediaAsset.create({
      data: {
        productId,
        url,
        type,
        altText,
      },
    });

    return media;
  }

  async findByProduct(productId: string) {
    if (!productId)
      throw new BadRequestException(ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD);

    const assets = await this.prisma.mediaAsset.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });

    return assets;
  }

  async update(id: string, dto: UpdateMediaPayload, userRole?: UserRole) {
    const existing = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(ERROR_MESSAGES.MEDIA.NOT_FOUND);

    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.MEDIA.PERMISSION_DENIED);
    }

    const updated = await this.prisma.mediaAsset.update({
      where: { id },
      data: {
        url: dto.url ?? existing.url,
        type: dto.type ?? existing.type,
        altText: dto.altText ?? existing.altText,
      },
    });

    return updated;
  }

  async delete(id: string, userRole?: UserRole) {
    const existing = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(ERROR_MESSAGES.MEDIA.NOT_FOUND);

    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.MEDIA.PERMISSION_DENIED);
    }

    await this.prisma.mediaAsset.delete({ where: { id } });

    return { message: ERROR_MESSAGES.MEDIA.DELETED_SUCCESS };
  }
}
