import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class CreatePrintFileDto {
  @ApiProperty({
    description: 'Product ID to associate with the print file',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @ValidateIf(
    (o) =>
      o.productId !== null && o.productId !== undefined && o.productId !== '',
  )
  @IsUUID()
  productId?: string;
}
