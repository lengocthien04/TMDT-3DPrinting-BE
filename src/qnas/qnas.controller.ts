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
import { AnswerQnaDto } from './dto/answer-qna.dto';
import { CreateQnaDto } from './dto/create-qna.dto';
import { QnasService } from './qnas.service';

@ApiTags('Q&A')
@Controller('qnas')
export class QnasController {
  constructor(private readonly qnasService: QnasService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all Q&A for a product (query param: productId)',
  })
  @ApiQuery({
    name: 'productId',
    required: true,
    description: 'Product UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of questions and answers for the product',
  })
  async findByProduct(@Query('productId') productId: string) {
    return this.qnasService.findByProduct(productId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ask a question about a product' })
  @ApiResponse({ status: 201, description: 'Question created successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async create(@Req() req, @Body() createQnaDto: CreateQnaDto) {
    const userId = req.user.sub;
    return this.qnasService.create(userId, createQnaDto as any);
  }

  @Patch(':id/answer')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Answer a question (admin only)' })
  @ApiParam({ name: 'id', description: 'Q&A id' })
  @ApiResponse({ status: 200, description: 'Answer added successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async answer(
    @Req() req,
    @Param('id') id: string,
    @Body() answerQnaDto: AnswerQnaDto,
  ) {
    const role = req.user?.role;
    return this.qnasService.answer(id, answerQnaDto as any, role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a question (question owner only)' })
  @ApiParam({ name: 'id', description: 'Q&A id' })
  @ApiResponse({ status: 200, description: 'Question deleted successfully' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async remove(@Req() req, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.qnasService.delete(userId, id);
  }
}
