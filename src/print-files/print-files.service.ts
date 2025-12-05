import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import fs from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../database/prisma.service';
import { IFileParserStrategy } from './strategies/file-parser-strategy.interface';
import { StlParserStrategy } from './strategies/stl-parser-strategy';

@Injectable()
export class PrintFilesService {
  private readonly uploadDir = join(process.cwd(), 'files', 'print-files');
  private fileParserStrategy: IFileParserStrategy;

  constructor(private readonly prisma: PrismaService) {
    this.fileParserStrategy = new StlParserStrategy();
  }

  async calculateModelSize(
    file: Express.Multer.File,
    deleteAfterCalculation = false,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type (STL files)
    const allowedMimeTypes = [
      'application/sla',
      'application/vnd.ms-pki.stl',
      'application/octet-stream',
    ];
    const allowedExtensions = ['.stl', '.STL'];
    const fileExtension = file.originalname.substring(
      file.originalname.lastIndexOf('.'),
    );

    if (
      !allowedMimeTypes.includes(file.mimetype) &&
      !allowedExtensions.includes(fileExtension)
    ) {
      throw new BadRequestException(
        'Invalid file type. Only STL files are supported.',
      );
    }

    const { filePath, filename } = await this.saveFileToDisk(file);

    const dimensions = this.fileParserStrategy.calculateDimensions(filePath);

    if (deleteAfterCalculation) await fs.promises.unlink(filePath);

    return { filename, ...dimensions, unit: 'mm' };
  }

  async create(file: Express.Multer.File, productId?: string) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const { filename, unit, ...dimensions } =
      await this.calculateModelSize(file);

    const printFile = await this.prisma.printFile.create({
      data: {
        productId: productId,
        url: `/files/print-files/${filename}`,
        type: 'stl',
        ...dimensions,
      },
    });

    return { ...printFile, unit };
  }

  async findAll() {
    return this.prisma.printFile.findMany({
      include: {
        product: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const printFile = await this.prisma.printFile.findUnique({
      where: { id },
      include: {
        product: {
          select: { id: true, name: true, description: true },
        },
      },
    });

    if (!printFile) {
      throw new NotFoundException('Print file not found');
    }

    return printFile;
  }

  async delete(id: string) {
    const printFile = await this.prisma.printFile.findUnique({
      where: { id },
    });

    if (!printFile) {
      throw new NotFoundException('Print file not found');
    }

    await this.prisma.printFile.delete({
      where: { id },
    });

    return { message: 'Print file deleted successfully' };
  }

  async saveFileToDisk(file: Express.Multer.File) {
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      await mkdir(this.uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${sanitizedFilename}`;
    const filePath = join(this.uploadDir, filename);

    // Save file to disk
    await writeFile(filePath, file.buffer);

    return { filePath, filename };
  }
}
