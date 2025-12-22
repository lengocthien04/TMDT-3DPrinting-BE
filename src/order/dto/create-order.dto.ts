import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItemDto } from './order-item.dto';

export class CreateOrderAddressDto {
  @ApiProperty()
  @IsString()
  recipient: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Địa chỉ thô FE gửi 1 cục text',
    example: '45 Tân Lập\nPhường 9',
  })
  @IsString()
  addressText: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: CreateOrderAddressDto })
  @ValidateNested()
  @Type(() => CreateOrderAddressDto)
  shippingAddress: CreateOrderAddressDto;

  @ApiProperty({ type: () => [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
