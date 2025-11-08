import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMaterialDto {
  @ApiPropertyOptional({
    description: 'Material name',
    example: 'ABS',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Material color',
    example: 'Blue',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({
    description: 'Material density (g/cm³)',
    example: 1.04,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  density?: number;

  @ApiPropertyOptional({
    description: 'Price factor multiplier',
    example: 1.2,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceFactor?: number;
}
