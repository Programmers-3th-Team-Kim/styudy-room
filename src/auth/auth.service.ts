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

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

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
    if (user && (await bcrypt.compare(password, user.password))) {
      const result = user.toObject();
      delete result.password;
      return user;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async login(user: User) {
    const payload = { id: user.id, sub: user._id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
