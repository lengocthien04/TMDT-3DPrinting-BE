import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsUUID, Min } from 'class-validator';

export class OrderItemDto {
  @ApiProperty({ description: 'ID biến thể sản phẩm', example: '8331c08c-24c1-4185-b8b6-a6b91ac9c3c8' })
  @IsUUID()
  variantId: string;

  @ApiProperty({ description: 'Số lượng', example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Đơn giá tại thời điểm đặt hàng', example: 35.5 })
  @IsNumber()
  @Min(0)
  price: number;
}
