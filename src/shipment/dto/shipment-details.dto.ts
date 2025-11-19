import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class ShipmentDetailsDto {
  @ApiPropertyOptional({ description: 'Đơn vị vận chuyển', example: 'GHN' })
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional({ description: 'Mã vận đơn', example: 'GHN123456789' })
  @IsOptional()
  @IsString()
  trackingNo?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái vận chuyển',
    enum: ShipmentStatus,
    default: ShipmentStatus.PREPARING,
  })
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @ApiPropertyOptional({ description: 'Thời điểm gửi hàng', example: '2024-01-20T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  shippedAt?: string;

  @ApiPropertyOptional({ description: 'Thời điểm giao hàng thành công', example: '2024-01-25T15:00:00Z' })
  @IsOptional()
  @IsDateString()
  deliveredAt?: string;
}
