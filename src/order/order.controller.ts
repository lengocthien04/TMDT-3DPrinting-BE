import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderService } from './order.service';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Tao don hang moi' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: JwtPayload) {
    return this.orderService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sach don hang' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  findAll(
    @Query('userId') userId?: string,
    @Query('status', new ParseEnumPipe(OrderStatus, { optional: true }))
    status?: OrderStatus,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.orderService.findAll(userId, status, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiet don hang' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.orderService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cap nhat don hang' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orderService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoa don hang' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.orderService.remove(id, user);
  }
}
