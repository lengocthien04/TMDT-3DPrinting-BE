import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ReviewsModule } from './reviews/reviews.module';
import { TagsModule } from './tags/tags.module';
import { MediaAssetsModule } from './media-assets/media-assets.module';
import { CartItemsModule } from './cart-items/cart-items.module';
import { CartsModule } from './carts/carts.module';
import { QnasModule } from './qnas/qnas.module';
import { MaterialsModule } from './materials/materials.module';
import { VariantsModule } from './variants/variants.module';
import { ProductsModule } from './products/products.module';
import { PrintFilesModule } from './print-files/print-files.module';
import { OrderModule } from './order/order.module';
import { OrderItemsModule } from './order-items/order-items.module';
import { ShipmentModule } from './shipment/shipment.module';
import { PaymentModule } from './payment/payment.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../..', 'files'),
      serveRoot: '/files',
      serveStaticOptions: { index: false },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    UsersModule,
    ReviewsModule,
    TagsModule,
    MediaAssetsModule,
    CartItemsModule,
    CartsModule,
    QnasModule,
    MaterialsModule,
    VariantsModule,
    ProductsModule,
    PrintFilesModule,
    OrderModule,
    OrderItemsModule,
    ShipmentModule,
    PaymentModule,
    VouchersModule,
    PaymentModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
