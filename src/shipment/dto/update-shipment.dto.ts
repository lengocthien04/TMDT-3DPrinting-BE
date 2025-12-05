import { PartialType } from '@nestjs/swagger';
import { ShipmentDetailsDto } from './shipment-details.dto';

export class UpdateShipmentDto extends PartialType(ShipmentDetailsDto) {}
