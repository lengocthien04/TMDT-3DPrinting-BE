import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ description: 'Tag name', example: 'prototyping' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;
}
