import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Res,
  Req,
  Get,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/createUser.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() createUserDto: CreateUserDto) {
    return await this.authService.signUp(createUserDto);
  }

  @Post('login')
  async login(
    @Body('id') id: string,
    @Body('password') password: string,
    @Res() res
  ) {
    try {
      const user = await this.authService.validateUser(id, password);
      const loginResponse = await this.authService.login(user, res);
      return res.json(loginResponse);
    } catch (error) {
      console.error('로그인 실패', error.message);
      throw new UnauthorizedException('로그인 실패');
    }
  }

  @Post('refresh-token')
  async refreshToken(@Req() req) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh Token을 찾을 수 없습니다.');
    }
    const newAccessToken = await this.authService.refreshToken(refreshToken);
    return { access_token: newAccessToken };
  }

  @Post('logout')
  async logout(@Res() res) {
    res.cookie('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
    });

    return res.status(200).json({ message: '로그아웃 성공' });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req) {
    const userInfo = await this.authService.getUserInfo(req.user.id);
    return { user: userInfo };
  }
}
