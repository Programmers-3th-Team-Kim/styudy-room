import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@Injectable()
export class SocketJwtAuthService {
  constructor(private readonly jwtService: JwtService) {}

  async validateSocket(socket: Socket): Promise<boolean> {
    const token = socket.handshake.auth?.token;

    if (!token || !token.startsWith('Bearer ')) {
      socket.emit('error', { message: 'Missing or invalid token' });
      return false;
    }

    const jwtToken = token.split(' ')[1];

    try {
      const payload = this.jwtService.verify(jwtToken);
      socket.data.user = payload;
      return true;
    } catch (error) {
      console.log(error.name);
      socket.emit('error', { message: 'Invalid token' });
      return false;
    }
  }
}
