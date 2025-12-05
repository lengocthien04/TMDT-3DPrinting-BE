import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ description: 'ID don hang', example: '40d9bd1c-21e0-4fcb-8d07-54bdbd14e5e9' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ description: 'ID bien the san pham', example: '8d4a3ec3-fc58-4eb0-8d83-0f7db8f5a18d' })
  @IsUUID()
  variantId: string;

  @ApiProperty({ description: 'So luong dat', example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Don gia tai thoi diem dat (server se lay gia hien tai neu khong gui)',
    example: 49.9,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
