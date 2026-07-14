import { Body, Controller, Post, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';
import { Patch } from '@nestjs/common';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RefreshGuard } from '../../common/guards/refresh.guard';
import { SignupDto } from './dto/signup.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetWithTokenDto } from './dto/reset-with-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })  // login: max 5 try per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login karein aur JWT token lein' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)   // ← ye route ab protected hai
  @ApiBearerAuth()           // ← Swagger ko batata hai ke token chahiye
  @ApiOperation({ summary: 'Apni details dekhein (token zaroori)' })
  getMe(@CurrentUser() user: any) {
    return user;
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apna password badlein (logged-in user)' })
  changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.userId, dto);
  }

  @Patch('reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kisi user ka password reset (sirf Super Admin)' })
  resetPassword(@CurrentUser() user: any, @Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto, user.tenantId);
  }

  @Post('refresh')
  @UseGuards(RefreshGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Naya access token lein (refresh token se)' })
  refresh(@CurrentUser() user: any) {
    return this.authService.refresh(user.userId, user.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout (refresh token revoke)' })
  logout(@CurrentUser() user: any) {
    return this.authService.logout(user.userId);
  }

  @Post('signup')
  @Throttle({ default: { limit: 3, ttl: 60000 } })  // signup: max 3 per minute (abuse rok)
  @ApiOperation({ summary: 'Naya business register karein (public signup)' })
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 900000 } })  // 3 per 15 min (spam rok)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Forgot password — reset link email karein' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password-with-token')
  @Throttle({ default: { limit: 5, ttl: 900000 } })  // token attempts bhi limit
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Token se password reset karein' })
  resetPasswordWithToken(@Body() dto: ResetWithTokenDto) {
    return this.authService.resetPasswordWithToken(dto);
  }
}