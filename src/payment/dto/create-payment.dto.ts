import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PaymentDetailsDto } from './payment-details.dto';

export class CreatePaymentDto extends PaymentDetailsDto {
  @ApiProperty({
    description: 'ID của đơn hàng cần tạo thanh toán',
    example: '9e626d3d-49c4-4c82-bcf1-9beb236d9a0a',
  })
  @IsUUID()
  orderId: string;
}
