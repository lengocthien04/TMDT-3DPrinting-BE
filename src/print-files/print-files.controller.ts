import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrintFilesService } from './print-files.service';
import { CreatePrintFileDto } from './dto/create-print-file.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Print Files')
@Controller('print-files')
@UseGuards(JwtAuthGuard)
export class PrintFilesController {
  constructor(private readonly printFilesService: PrintFilesService) {}

  @Public()
  @Post('calculate-size')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Calculate 3D model size from STL file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'STL file to analyze',
        },
      },
    },
  })
  async calculateSize(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const { filename, ...dimensions } =
      await this.printFilesService.calculateModelSize(file, true);
    return dimensions;
  }

  @Post()
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload print file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'STL file to upload',
        },
        productId: {
          type: 'string',
          description: 'Optional product ID to associate with',
          nullable: true,
        },
      },
    },
  })
  async create(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() createPrintFileDto: CreatePrintFileDto,
  ) {
    return this.printFilesService.create(
      file,
      createPrintFileDto.productId || undefined,
    );
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all print files' })
  findAll() {
    return this.printFilesService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get print file by ID' })
  findOne(@Param('id') id: string) {
    return this.printFilesService.findOne(id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete print file' })
  delete(@Param('id') id: string) {
    return this.printFilesService.delete(id);
  }
}
