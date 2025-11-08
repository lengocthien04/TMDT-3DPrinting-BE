import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnswerQnaDto {
  @ApiProperty({
    description: 'Answer text',
    example: 'This product is made of high-quality PLA plastic.',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  answer: string;
}
