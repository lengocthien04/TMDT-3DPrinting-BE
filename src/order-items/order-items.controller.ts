import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { OrderItemsService } from './order-items.service';

@ApiTags('Order Items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('order-items')
export class OrderItemsController {
  constructor(private readonly orderItemsService: OrderItemsService) {}

  @Post()
  @ApiOperation({ summary: 'Thêm sản phẩm vào một đơn hàng' })
  create(@Body() dto: CreateOrderItemDto) {
    return this.orderItemsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách sản phẩm theo đơn hàng' })
  @ApiQuery({ name: 'orderId', required: true })
  findByOrder(@Query('orderId') orderId: string) {
    return this.orderItemsService.findByOrder(orderId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết một order item' })
  findOne(@Param('id') id: string) {
    return this.orderItemsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật order item' })
  update(@Param('id') id: string, @Body() dto: UpdateOrderItemDto) {
    return this.orderItemsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá order item' })
  remove(@Param('id') id: string) {
    return this.orderItemsService.remove(id);
  }
}
