import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Materials')
@Controller('materials')
@UseGuards(JwtAuthGuard)
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all materials' })
  @ApiResponse({ status: 200, description: 'List of all materials' })
  async findAll() {
    return this.materialsService.findAll();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get material by id' })
  @ApiParam({ name: 'id', description: 'Material id' })
  @ApiResponse({ status: 200, description: 'Material details with variants' })
  @ApiResponse({ status: 404, description: 'Material not found' })
  async findOne(@Param('id') id: string) {
    return this.materialsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new material (admin only)' })
  @ApiResponse({ status: 201, description: 'Material created successfully' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 409, description: 'Material name already exists' })
  async create(@Req() req, @Body() createMaterialDto: CreateMaterialDto) {
    const userRole = req.user?.role;
    return this.materialsService.create(createMaterialDto as any, userRole);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update material (admin only)' })
  @ApiParam({ name: 'id', description: 'Material id' })
  @ApiResponse({ status: 200, description: 'Material updated successfully' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 404, description: 'Material not found' })
  @ApiResponse({ status: 409, description: 'Material name already exists' })
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateMaterialDto: UpdateMaterialDto,
  ) {
    const userRole = req.user?.role;
    return this.materialsService.update(id, updateMaterialDto as any, userRole);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete material (admin only)' })
  @ApiParam({ name: 'id', description: 'Material id' })
  @ApiResponse({ status: 200, description: 'Material deleted successfully' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 404, description: 'Material not found' })
  async remove(@Req() req, @Param('id') id: string) {
    const userRole = req.user?.role;
    return this.materialsService.delete(id, userRole);
  }
}
