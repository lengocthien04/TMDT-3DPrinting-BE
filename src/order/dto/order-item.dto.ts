import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class OrderItemDto {
  @ApiProperty({ description: 'ID bien the san pham', example: '8331c08c-24c1-4185-b8b6-a6b91ac9c3c8' })
  @IsUUID()
  variantId: string;

  @ApiProperty({ description: 'So luong', example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Don gia tai thoi diem dat (se duoc server tinh neu khong gui)',
    example: 35.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
