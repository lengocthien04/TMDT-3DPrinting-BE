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
  Query,
} from '@nestjs/common';
import { VariantsService } from './variants.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Variants')
@Controller('variants')
@UseGuards(JwtAuthGuard)
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all variants or variants by product (query param: productId)',
  })
  @ApiQuery({
    name: 'productId',
    required: false,
    description: 'Product UUID to filter variants',
  })
  @ApiResponse({ status: 200, description: 'List of variants' })
  async findAll(@Query('productId') productId?: string) {
    if (productId) {
      return this.variantsService.findByProduct(productId);
    }
    return this.variantsService.findAll();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get variant by id' })
  @ApiParam({ name: 'id', description: 'Variant id' })
  @ApiResponse({
    status: 200,
    description: 'Variant details with product and material',
  })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async findOne(@Param('id') id: string) {
    return this.variantsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new variant' })
  @ApiResponse({ status: 201, description: 'Variant created successfully' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 404, description: 'Product or Material not found' })
  async create(@Body() createVariantDto: CreateVariantDto) {
    return this.variantsService.create(createVariantDto as any);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update variant' })
  @ApiParam({ name: 'id', description: 'Variant id' })
  @ApiResponse({ status: 200, description: 'Variant updated successfully' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateVariantDto: UpdateVariantDto,
  ) {
    return this.variantsService.update(id, updateVariantDto as any, req.user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete variant' })
  @ApiParam({ name: 'id', description: 'Variant id' })
  @ApiResponse({ status: 200, description: 'Variant deleted successfully' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async remove(@Req() req, @Param('id') id: string) {
    return this.variantsService.delete(id, req.user);
  }
}
