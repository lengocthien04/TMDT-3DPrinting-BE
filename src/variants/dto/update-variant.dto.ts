import {
  IsString,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  IsOptional,
  IsUUID,
  IsNumber,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVariantDto {
  @ApiPropertyOptional({
    description: 'Material ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  materialId?: string;

  @ApiPropertyOptional({
    description: 'Variant name',
    example: 'Medium - Blue ABS',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Volume in mm3',
    example: 2000.75,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  volume?: number;

  @ApiPropertyOptional({
    description: 'Stock quantity',
    example: 100,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;
}
