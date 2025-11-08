import {
  IsUUID,
  IsString,
  MinLength,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVariantDto {
  @ApiProperty({
    description: 'Product UUID',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Material UUID',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsUUID()
  materialId: string;

  @ApiProperty({
    description: 'Variant name',
    example: 'Small - Red PLA',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Stock quantity',
    example: 50,
    minimum: 0,
    default: 0,
  })
  @IsInt()
  @Min(0)
  stock: number;
}
