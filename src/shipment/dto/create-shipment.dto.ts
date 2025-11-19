import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { ShipmentDetailsDto } from './shipment-details.dto';

export class CreateShipmentDto extends ShipmentDetailsDto {
  @ApiProperty({
    description: 'ID đơn hàng cần tạo hồ sơ vận chuyển',
    example: 'f78e7a5e-6d1a-4de2-a8eb-bcb81a63b6c0',
  })
  @IsUUID()
  orderId: string;
}
