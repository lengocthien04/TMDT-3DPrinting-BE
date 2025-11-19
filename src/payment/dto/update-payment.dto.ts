import { PartialType } from '@nestjs/swagger';
import { PaymentDetailsDto } from './payment-details.dto';

export class UpdatePaymentDto extends PartialType(PaymentDetailsDto) {}
