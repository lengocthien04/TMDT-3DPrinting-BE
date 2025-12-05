import { ApiPropertyOptional } from '@nestjs/swagger';
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
import { UpdatePaymentDto } from '../../payment/dto/update-payment.dto';
import { UpdateShipmentDto } from '../../shipment/dto/update-shipment.dto';
import { OrderItemDto } from './order-item.dto';

export class UpdateOrderDto {
  @ApiPropertyOptional({ description: 'ID dia chi giao hang moi' })
  @IsOptional()
  @IsUUID()
  addressId?: string;

  @ApiPropertyOptional({ description: 'Trang thai don hang', enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Danh sach san pham cap nhat, truyen toan bo danh sach neu muon thay doi',
    type: () => [OrderItemDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];

  @ApiPropertyOptional({ description: 'Cap nhat thong tin thanh toan', type: () => UpdatePaymentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePaymentDto)
  payment?: UpdatePaymentDto;

  @ApiPropertyOptional({ description: 'Cap nhat thong tin van chuyen', type: () => UpdateShipmentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateShipmentDto)
  shipment?: UpdateShipmentDto;

  @ApiPropertyOptional({
    description: '(Deprecated) Tong tien client gui len se bi bo qua, server tu tinh',
    example: 250,
    deprecated: true,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional({
    description: 'Ma voucher moi (null de huy voucher hien tai)',
    example: 'SALE2024',
  })
  @IsOptional()
  @IsString()
  voucherCode?: string | null;
}
