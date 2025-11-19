import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PaymentDetailsDto {
  @ApiProperty({
    description: 'Phương thức thanh toán',
    enum: PaymentMethod,
    default: PaymentMethod.CREDIT_CARD,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Trạng thái thanh toán',
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Số tiền thanh toán, mặc định sẽ dùng tổng tiền đơn hàng',
    example: 120.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({
    description: 'Mã giao dịch từ cổng thanh toán (nếu có)',
    example: 'PAY-2024-0001',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;
}
