import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CartItemsService } from '../cart-items/cart-items.service';
import { CreateCartItemDto } from '../cart-items/dto/create-cart-item.dto';
import { UpdateCartItemDto } from '../cart-items/dto/update-cart-item.dto';
import { CartsService } from './carts.service';

@ApiTags('Carts')
@Controller('carts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class CartsController {
  constructor(
    private readonly cartsService: CartsService,
    private readonly cartItemsService: CartItemsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get or create cart for current user' })
  @ApiResponse({ status: 200, description: 'User cart with items' })
  async getOrCreate(@Req() req) {
    const userId = req.user.sub;
    return this.cartsService.getOrCreate(userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to current user cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  @ApiResponse({ status: 409, description: 'Item already in cart' })
  async addItem(@Req() req, @Body() dto: CreateCartItemDto) {
    const userId = req.user.sub;
    return this.cartItemsService.create(userId, dto as any);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiParam({ name: 'id', description: 'Cart item id' })
  @ApiResponse({ status: 200, description: 'Cart item updated' })
  async updateItem(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const userId = req.user.sub;
    return this.cartItemsService.update(userId, id, dto as any);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'id', description: 'Cart item id' })
  @ApiResponse({ status: 200, description: 'Item removed from cart' })
  async deleteItem(@Req() req, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.cartItemsService.delete(userId, id);
  }
}
