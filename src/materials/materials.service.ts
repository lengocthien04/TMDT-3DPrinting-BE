import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '@prisma/client';
import { ERROR_MESSAGES } from '../common/constants/app.constants';

type CreateMaterialPayload = {
  name: string;
  color?: string;
  density?: number;
  priceFactor?: number;
  pricePerMm3?: number;
};

type UpdateMaterialPayload = Partial<CreateMaterialPayload>;

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.material.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const material = await this.prisma.material.findUnique({
      where: { id },
    });

    if (!material) {
      throw new NotFoundException(ERROR_MESSAGES.MATERIAL.NOT_FOUND);
    }

    return material;
  }

  async create(payload: CreateMaterialPayload, userRole?: UserRole) {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.MATERIAL.PERMISSION_DENIED);
    }

    const { name, color, density, priceFactor, pricePerMm3 } = payload;

    // Check for duplicate name
    const existing = await this.prisma.material.findFirst({
      where: { name },
    });

    if (existing) {
      throw new ConflictException(ERROR_MESSAGES.MATERIAL.DUPLICATE_NAME);
    }

    const material = await this.prisma.material.create({
      data: {
        name,
        color,
        density,
        priceFactor,
        pricePerMm3,
      },
    });

    return material;
  }

  async update(id: string, dto: UpdateMaterialPayload, userRole?: UserRole) {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.MATERIAL.PERMISSION_DENIED);
    }

    const existing = await this.prisma.material.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES.MATERIAL.NOT_FOUND);
    }

    // Check for duplicate name if name is being updated
    if (dto.name && dto.name !== existing.name) {
      const duplicate = await this.prisma.material.findFirst({
        where: {
          name: dto.name,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictException(ERROR_MESSAGES.MATERIAL.DUPLICATE_NAME);
      }
    }

    const updated = await this.prisma.material.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        color: dto.color ?? existing.color,
        density: dto.density ?? existing.density,
        priceFactor: dto.priceFactor ?? existing.priceFactor,
        pricePerMm3: dto.pricePerMm3 ?? existing.pricePerMm3,
      },
    });

    return updated;
  }

  async delete(id: string, userRole?: UserRole) {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.MATERIAL.PERMISSION_DENIED);
    }

    const existing = await this.prisma.material.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES.MATERIAL.NOT_FOUND);
    }

    await this.prisma.material.delete({
      where: { id },
    });

    return { message: ERROR_MESSAGES.MATERIAL.DELETED_SUCCESS };
  }
}
