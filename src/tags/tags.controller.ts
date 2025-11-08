import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagsService } from './tags.service';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all tags' })
  @ApiResponse({ status: 200, description: 'List of tags' })
  async findAll() {
    return this.tagsService.findAll();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a tag (admin only)' })
  @ApiResponse({ status: 201, description: 'Tag created' })
  async create(@Req() req, @Body() dto: CreateTagDto) {
    const role = req.user?.role;
    return this.tagsService.create(dto, role);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a tag (admin only)' })
  @ApiParam({ name: 'id', description: 'Tag id' })
  async update(@Req() req, @Param('id') id: string, @Body() dto: UpdateTagDto) {
    const role = req.user?.role;
    return this.tagsService.update(id, dto, role);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a tag (admin only)' })
  @ApiParam({ name: 'id', description: 'Tag id' })
  async delete(@Req() req, @Param('id') id: string) {
    const role = req.user?.role;
    return this.tagsService.delete(id, role);
  }
}
