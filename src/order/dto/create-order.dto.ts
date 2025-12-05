import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentDetailsDto } from '../../payment/dto/payment-details.dto';
import { ShipmentDetailsDto } from '../../shipment/dto/shipment-details.dto';
import { OrderItemDto } from './order-item.dto';

export class CreateOrderDto {
  @ApiPropertyOptional({
    description:
      'ID nguoi dung (CUSTOMER co the bo trong, mac dinh lay tu token; ADMIN co the tao thay nguoi dung khac)',
    example: 'b1b88ca2-8be1-4bf3-9d6b-3de6a3ff951e',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'ID dia chi giao hang', example: 'd3aca6ec-9a93-4432-ba01-0c1a56c41080' })
  @IsUUID()
  addressId: string;

  @ApiPropertyOptional({
    description: 'Trang thai don hang, mac dinh la PENDING',
    enum: OrderStatus,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiProperty({
    description: 'Danh sach san pham trong don hang',
    type: () => [OrderItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({
    description: 'Thong tin thanh toan di kem',
    type: () => PaymentDetailsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentDetailsDto)
  payment?: PaymentDetailsDto;

  @ApiPropertyOptional({
    description: 'Thong tin van chuyen ban dau',
    type: () => ShipmentDetailsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShipmentDetailsDto)
  shipment?: ShipmentDetailsDto;

  @ApiPropertyOptional({
    description: 'Ma voucher giam gia (tuy chon)',
    example: 'SALE2024',
  })
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiPropertyOptional({
    description: '(Deprecated) Tong tien gui len se bi bo qua, server tu tinh',
    example: 199.99,
    deprecated: true,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;
}
