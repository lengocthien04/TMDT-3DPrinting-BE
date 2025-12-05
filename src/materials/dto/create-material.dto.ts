import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMaterialDto {
  @ApiProperty({
    description: 'Material name',
    example: 'PLA',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Material color',
    example: 'Red',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({
    description: 'Material density (g/cm³)',
    example: 1.25,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  density?: number;

  @ApiPropertyOptional({
    description: 'Price factor multiplier',
    example: 1.5,
    minimum: 0,
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceFactor?: number;

  @ApiPropertyOptional({
    description: 'Price per mm3 volume',
    example: 100,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerMm3?: number;
}
