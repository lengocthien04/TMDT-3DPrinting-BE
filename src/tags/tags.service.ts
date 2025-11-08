import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '@prisma/client';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { ERROR_MESSAGES } from '../common/constants/app.constants';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreateTagDto, userRole?: UserRole) {
    // only admin can create tags
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.REVIEW.PERMISSION_DENIED);
    }

    const existing = await this.prisma.tag.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(ERROR_MESSAGES.CATEGORY.DUPLICATE_NAME);
    }

    const tag = await this.prisma.tag.create({ data: { name: dto.name } });
    return tag;
  }

  async update(id: string, dto: UpdateTagDto, userRole?: UserRole) {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.REVIEW.PERMISSION_DENIED);
    }

    const existing = await this.prisma.tag.findUnique({ where: { id } });
    if (!existing)
      throw new NotFoundException(ERROR_MESSAGES.CATEGORY.NOT_FOUND);

    if (dto.name) {
      const other = await this.prisma.tag.findFirst({
        where: { name: dto.name, id: { not: id } },
      });
      if (other)
        throw new ConflictException(ERROR_MESSAGES.CATEGORY.DUPLICATE_NAME);
    }

    const updated = await this.prisma.tag.update({
      where: { id },
      data: { name: dto.name ?? existing.name },
    });
    return updated;
  }

  async delete(id: string, userRole?: UserRole) {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.REVIEW.PERMISSION_DENIED);
    }

    const existing = await this.prisma.tag.findUnique({ where: { id } });
    if (!existing)
      throw new NotFoundException(ERROR_MESSAGES.CATEGORY.NOT_FOUND);

    await this.prisma.tag.delete({ where: { id } });
    return { message: 'Tag deleted successfully' };
  }
}
