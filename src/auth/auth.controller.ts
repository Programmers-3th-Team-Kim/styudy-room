import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Res,
  Req,
  Get,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/createUser.dto';
import { AuthGuard } from '@nestjs/passport';
import { ChangePasswordDto } from './dto/changePassword.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() createUserDto: CreateUserDto) {
    return await this.authService.signUp(createUserDto);
  }

  @Get('check-duplicate')
  async checkDuplicate(
    @Query('field') field: string,
    @Query('value') value: string
  ) {
    return await this.authService.checkDuplicate(field, value);
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
    const refreshToken = req.cookies['refreshToken'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh Token을 찾을 수 없습니다.');
    }

    const { accessToken, user } =
      await this.authService.refreshToken(refreshToken);

    return { accessToken, user };
  }

  @Post('logout')
  async logout(@Res() res) {
    res.clearCookie('refreshToken');
    return res.status(200).json({ message: '로그아웃 성공' });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('verify-password')
  async verifyPassword(
    @Req() req,
    @Body('currentPassword') currentPassword: string
  ) {
    const userId = req.user.id;
    const isPasswordCorrect = await this.authService.verifyPassword(
      userId,
      currentPassword
    );

    if (!isPasswordCorrect) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    }

    return { message: '비밀번호가 확인되었습니다.' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('change-password')
  async changePassword(
    @Req() req,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    const userId = req.user.id;
    await this.authService.changePassword(
      userId,
      changePasswordDto.newPassword
    );
    return { message: '비밀번호가 성공적으로 변경되었습니다.' };
  }
}
