import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { VouchersService } from './vouchers.service';

@ApiTags('Vouchers')
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Danh sach voucher' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(
    @Query('isActive', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
  ) {
    return this.vouchersService.findAll(isActive);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiet voucher' })
  findOne(@Param('id') id: string) {
    return this.vouchersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tao voucher moi' })
  create(@Body() dto: CreateVoucherDto, @CurrentUser() user: JwtPayload) {
    return this.vouchersService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cap nhat voucher' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVoucherDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vouchersService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoa voucher' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.vouchersService.remove(id, user);
  }
}
