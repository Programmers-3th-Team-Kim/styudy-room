import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/users.schema';
import { UsersService } from 'src/users/users.service';
import { CreateUserDto } from 'src/users/dto/createUser.dto';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenDto } from './dto/refreshToken.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
    private jwtService: JwtService
  ) {}

  getJwtAccessToken(user: User): string {
    const payload = { id: user.id, _id: user._id };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '15m',
    });
  }

  getJwtRefreshToken(user: User): string {
    const payload = { id: user.id, _id: user._id };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });
  }

  async signUp(createUserDto: CreateUserDto): Promise<void> {
    const user = await this.usersService.findOne(createUserDto.id);

    if (user) {
      throw new ConflictException('이미 존재하는 사용자입니다.');
    }

    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltOrRounds
    );

    await this.usersService.create({
      ...createUserDto,
      password: hashedPassword,
    });
  }

  async validateUser(id: string, password: string): Promise<User> {
    const user = await this.usersService.findOne(id);

    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('비밀번호가 잘못되었습니다.');
    }

    return user;
  }

  async login(user: User, res) {
    const accessToken = this.getJwtAccessToken(user);
    const refreshToken = this.getJwtRefreshToken(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      accessToken: accessToken,
      user: {
        id: user.id,
        nickname: user.nickname,
        imageUrl: user.imageUrl,
        introduction: user.introduction,
        dDay: user.dDay,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenDto> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.findOne(payload.id);
      if (!user) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
      }

      const newAccessToken = this.getJwtAccessToken(user);

      return {
        accessToken: newAccessToken,
        user: {
          id: user.id,
          nickname: user.nickname,
          imageUrl: user.imageUrl,
          introduction: user.introduction,
        },
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('리프레시 토큰이 만료되었습니다.');
      } else if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
      } else {
        console.error('Unexpected error:', error);
        throw new UnauthorizedException(
          '리프레시 토큰 처리 중 오류가 발생했습니다.'
        );
      }
    }
  }

  async getUserInfo(userId: string) {
    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    const userInfo = user.toObject();
    delete userInfo.password;
    return userInfo;
  }
}
