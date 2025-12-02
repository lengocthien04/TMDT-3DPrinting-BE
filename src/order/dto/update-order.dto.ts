import { ApiPropertyOptional } from '@nestjs/swagger';
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
import { UpdatePaymentDto } from '../../payment/dto/update-payment.dto';
import { UpdateShipmentDto } from '../../shipment/dto/update-shipment.dto';
import { OrderItemDto } from './order-item.dto';

export class UpdateOrderDto {
  @ApiPropertyOptional({ description: 'ID địa chỉ giao hàng mới' })
  @IsOptional()
  @IsUUID()
  addressId?: string;

  @ApiPropertyOptional({ description: 'Trạng thái đơn hàng', enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Danh sách sản phẩm cập nhật, truyền toàn bộ danh sách nếu muốn thay đổi',
    type: () => [OrderItemDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];

  @ApiPropertyOptional({ description: 'Tổng tiền mới', example: 250 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'Cập nhật thông tin thanh toán', type: () => UpdatePaymentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePaymentDto)
  payment?: UpdatePaymentDto;

  @ApiPropertyOptional({ description: 'Cập nhật thông tin vận chuyển', type: () => UpdateShipmentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateShipmentDto)
  shipment?: UpdateShipmentDto;
}
