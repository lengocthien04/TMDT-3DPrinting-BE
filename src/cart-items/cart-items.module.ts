import { Module } from '@nestjs/common';
import { CartItemsService } from './cart-items.service';

@Module({
  providers: [CartItemsService],
  exports: [CartItemsService],
})
export class CartItemsModule {}
