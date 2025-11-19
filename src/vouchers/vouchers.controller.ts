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
  @ApiOperation({ summary: 'Danh sách voucher' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(
    @Query('isActive', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
  ) {
    return this.vouchersService.findAll(isActive);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết voucher' })
  findOne(@Param('id') id: string) {
    return this.vouchersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo voucher mới' })
  create(@Body() dto: CreateVoucherDto) {
    return this.vouchersService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật voucher' })
  update(@Param('id') id: string, @Body() dto: UpdateVoucherDto) {
    return this.vouchersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá voucher' })
  remove(@Param('id') id: string) {
    return this.vouchersService.remove(id);
  }
}
