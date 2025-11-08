import { IsUUID, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQnaDto {
  @ApiProperty({
    description: 'Product UUID',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Question text',
    example: 'What material is this product made of?',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  question: string;
}
