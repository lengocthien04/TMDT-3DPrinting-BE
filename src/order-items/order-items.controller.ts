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
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
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
  @ApiOperation({ summary: 'Them san pham vao mot don hang' })
  create(
    @Body() dto: CreateOrderItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orderItemsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sach san pham theo don hang' })
  @ApiQuery({ name: 'orderId', required: true })
  findByOrder(
    @Query('orderId') orderId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orderItemsService.findByOrder(orderId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiet mot order item' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.orderItemsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cap nhat order item' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrderItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orderItemsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoa order item' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.orderItemsService.remove(id, user);
  }
}
