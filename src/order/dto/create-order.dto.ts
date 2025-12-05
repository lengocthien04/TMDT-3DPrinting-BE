import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentDetailsDto } from '../../payment/dto/payment-details.dto';
import { ShipmentDetailsDto } from '../../shipment/dto/shipment-details.dto';
import { OrderItemDto } from './order-item.dto';

export class CreateOrderDto {
  @ApiProperty({ description: 'ID của người dùng đặt hàng', example: 'b1b88ca2-8be1-4bf3-9d6b-3de6a3ff951e' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'ID địa chỉ giao hàng', example: 'd3aca6ec-9a93-4432-ba01-0c1a56c41080' })
  @IsUUID()
  addressId: string;

  @ApiPropertyOptional({
    description: 'Trạng thái đơn hàng, mặc định là PENDING',
    enum: OrderStatus,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiProperty({
    description: 'Danh sách sản phẩm trong đơn hàng',
    type: () => [OrderItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ description: 'Tổng tiền đơn hàng', example: 199.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional({
    description: 'Thông tin thanh toán đi kèm',
    type: () => PaymentDetailsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentDetailsDto)
  payment?: PaymentDetailsDto;

  @ApiPropertyOptional({
    description: 'Thông tin vận chuyển ban đầu',
    type: () => ShipmentDetailsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShipmentDetailsDto)
  shipment?: ShipmentDetailsDto;
}
