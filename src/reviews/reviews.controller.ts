import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a product review (authenticated)' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Req() req, @Body() dto: CreateReviewDto) {
    const userId = req.user.sub;
    const review = await this.reviewsService.create(userId, dto);

    return {
      message: 'Review created',
      review,
    };
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get reviews for a product (query parameter: productId)',
  })
  @ApiQuery({ name: 'productId', description: 'Product UUID', required: true })
  @ApiResponse({ status: 200, description: 'List of product reviews' })
  @ApiResponse({ status: 400, description: 'Bad request / missing productId' })
  async getByProduct(@Query('productId') productId: string) {
    return this.reviewsService.findByProduct(productId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a review (owner or admin)' })
  @ApiParam({ name: 'id', description: 'Review id' })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    const userId = req.user.sub;
    const role = req.user.role;
    return this.reviewsService.update(userId, id, dto, role);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a review (owner or admin)' })
  @ApiParam({ name: 'id', description: 'Review id' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async delete(@Req() req, @Param('id') id: string) {
    const userId = req.user.sub;
    const role = req.user.role;
    return this.reviewsService.delete(userId, id, role);
  }
}
