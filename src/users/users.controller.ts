import {
  Controller,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns user profile' })
  async getProfile(@Req() req) {
    const userId = req.user.sub;
    const user = await this.usersService.getProfile(userId);

    // Map DB snake_case → API camelCase for consistent frontend responses
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile (email/username)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Req() req, @Body() dto: UpdateProfileDto) {
    const userId = req.user.sub;
    const updated = await this.usersService.updateProfile(userId, dto);

    return {
      message: 'Profile updated successfully',
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        role: updated.role,
        updatedAt: updated.updatedAt,
      },
    };
  }

  @Patch('password')
  @ApiOperation({ summary: 'Change account password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    const userId = req.user.sub;
    return this.usersService.changePassword(userId, dto);
  }

  @Delete('account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate (soft delete) account' })
  @ApiResponse({ status: 200, description: 'Account deactivated successfully' })
  async deleteAccount(@Req() req, @Body() dto: DeleteAccountDto) {
    const userId = req.user.sub;
    return this.usersService.deleteAccount(userId, dto);
  }
}
