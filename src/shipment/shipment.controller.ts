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
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
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
  @ApiOperation({ summary: 'Tao thong tin van chuyen cho don hang' })
  create(@Body() dto: CreateShipmentDto, @CurrentUser() user: JwtPayload) {
    return this.shipmentService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sach van chuyen' })
  @ApiQuery({ name: 'status', required: false, enum: ShipmentStatus })
  findAll(
    @Query('status', new ParseEnumPipe(ShipmentStatus, { optional: true }))
    status?: ShipmentStatus,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.shipmentService.findAll(status, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiet van chuyen' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.shipmentService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cap nhat van chuyen' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateShipmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.shipmentService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoa van chuyen' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.shipmentService.remove(id, user);
  }
}
