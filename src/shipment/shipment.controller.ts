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
import { ShipmentStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { ShipmentService } from './shipment.service';

@ApiTags('Shipments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shipment')
export class ShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo thông tin vận chuyển cho đơn hàng' })
  create(@Body() dto: CreateShipmentDto) {
    return this.shipmentService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách vận chuyển' })
  @ApiQuery({ name: 'status', required: false, enum: ShipmentStatus })
  findAll(
    @Query('status', new ParseEnumPipe(ShipmentStatus, { optional: true }))
    status?: ShipmentStatus,
  ) {
    return this.shipmentService.findAll(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết vận chuyển' })
  findOne(@Param('id') id: string) {
    return this.shipmentService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật vận chuyển' })
  update(@Param('id') id: string, @Body() dto: UpdateShipmentDto) {
    return this.shipmentService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá vận chuyển' })
  remove(@Param('id') id: string) {
    return this.shipmentService.remove(id);
  }
}
