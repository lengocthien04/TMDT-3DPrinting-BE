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
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentService } from './payment.service';

@ApiTags('Payments')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /* ======================================================
     VNPay - PUBLIC ENDPOINTS (NO AUTH)
     ====================================================== */

  @Get('vnpay-return')
  @ApiOperation({ summary: 'VNPay Return URL (browser redirect)' })
  vnpayReturn(@Query() query: any) {
    return this.paymentService.handleVnPayReturn(query);
  }

  @Get('vnpay-ipn')
  @ApiOperation({ summary: 'VNPay IPN (server to server)' })
  vnpayIpn(@Query() query: any) {
    return this.paymentService.handleVnPayIpn(query);
  }

  /* ======================================================
     AUTHENTICATED ENDPOINTS
     ====================================================== */

  @Post(':id/vnpay-url')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy URL thanh toán VNPay' })
  getVnPayUrl(
    @Param('id') id: string,
    @Req() req: any,
    @CurrentUser() user: JwtPayload,
  ) {
    const ipAddr =
      req.headers['x-forwarded-for'] ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    return this.paymentService.createVnPayUrl(id, ipAddr);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Tạo thanh toán cho đơn hàng' })
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: JwtPayload) {
    return this.paymentService.create(dto, user);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Danh sách thanh toán' })
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Chi tiết thanh toán' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.paymentService.findOne(id, user);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cập nhật thanh toán' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Xóa thanh toán' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.paymentService.remove(id, user);
  }
}
