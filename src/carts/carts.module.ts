import { Module } from '@nestjs/common';
import { CartItemsModule } from '../cart-items/cart-items.module';
import { CartsController } from './carts.controller';
import { CartsService } from './carts.service';

@Module({
  imports: [CartItemsModule],
  controllers: [CartsController],
  providers: [CartsService],
  exports: [CartsService],
})
export class CartsModule {}
