import { IsString, IsUUID, IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Product UUID to which the review belongs',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Rating between 1 and 5',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    description: 'Optional review text',
    example: 'Great quality and fast delivery',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
