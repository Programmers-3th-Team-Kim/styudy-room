import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@Injectable()
export class SocketJwtAuthService {
  constructor(private readonly jwtService: JwtService) {}

  async validateSocket(socket: Socket): Promise<boolean> {
    const token = socket.handshake.auth?.token;

    if (!token || !token.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid token');
    }

    const jwtToken = token.split(' ')[1];

    try {
      const payload = this.jwtService.verify(jwtToken);
      // 토큰 유효성 확인 후 필요한 로직 수행
      socket.data.user = payload; // 예: 유저 데이터를 소켓에 저장
      return true;
    } catch (error) {
      console.log(error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
