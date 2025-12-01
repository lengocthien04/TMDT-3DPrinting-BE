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
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentService } from './payment.service';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Tao thanh toan cho don hang' })
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: JwtPayload) {
    return this.paymentService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sach thanh toan' })
  @ApiQuery({ name: 'status', required: false, enum: PaymentStatus })
  @ApiQuery({ name: 'method', required: false, enum: PaymentMethod })
  findAll(
    @Query('status', new ParseEnumPipe(PaymentStatus, { optional: true }))
    status?: PaymentStatus,
    @Query('method', new ParseEnumPipe(PaymentMethod, { optional: true }))
    method?: PaymentMethod,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.paymentService.findAll(status, method, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiet thanh toan' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.paymentService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cap nhat thanh toan' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoa thanh toan' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.paymentService.remove(id, user);
  }
}
