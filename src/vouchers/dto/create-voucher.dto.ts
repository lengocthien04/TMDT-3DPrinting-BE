import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateVoucherDto {
  @ApiProperty({ description: 'Mã voucher duy nhất', example: 'SALE2024' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Mức giảm giá (ví dụ 0.1 = 10%)', example: 0.15 })
  @IsNumber()
  @Min(0)
  discount: number;

  @ApiProperty({ description: 'Ngày hết hạn', example: '2024-12-31T23:59:59Z' })
  @IsDateString()
  expiresAt: string;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
