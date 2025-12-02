import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseBoolPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  findAll(
    @Query('isActive', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
  ) {
    return this.productsService.findAll(isActive);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product (Admin only)' })
  create(@Req() req, @Body() createProductDto: CreateProductDto) {
    const userRole = req.user?.role;
    return this.productsService.create(createProductDto, userRole);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product (Admin only)' })
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const userRole = req.user?.role;
    return this.productsService.update(id, updateProductDto, userRole);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product (Admin only)' })
  delete(@Req() req, @Param('id') id: string) {
    const userRole = req.user?.role;
    return this.productsService.delete(id, userRole);
  }
}
