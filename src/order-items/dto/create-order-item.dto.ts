import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsUUID, Min } from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ description: 'ID đơn hàng', example: '40d9bd1c-21e0-4fcb-8d07-54bdbd14e5e9' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ description: 'ID biến thể sản phẩm', example: '8d4a3ec3-fc58-4eb0-8d83-0f7db8f5a18d' })
  @IsUUID()
  variantId: string;

  @ApiProperty({ description: 'Số lượng đặt', example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Đơn giá tại thời điểm đặt hàng', example: 49.9, minimum: 0 })
  @IsNumber()
  @Min(0)
  price: number;
}
