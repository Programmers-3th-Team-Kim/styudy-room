import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatDto, NoticeDto } from './dto/server.dto';

@Injectable()
export class ChatService {
  joinRoom(
    server: Server,
    client: Socket,
    roomId: string,
    nickname: string
  ): void {
    client.join(roomId);

    const joinTime = new Date().toISOString();

    const noticeData: NoticeDto = {
      type: 'notice',
      message: `${nickname}님께서 입장하셨습니다.`,
    };
    server.to(roomId).emit('notice', noticeData);
    client.emit('yourJoinTime', { joinTime });
  }

  leaveRoom(
    server: Server,
    client: Socket,
    roomId: string,
    nickname: string
  ): void {
    client.leave(roomId);
    const noticeData: NoticeDto = {
      type: 'notice',
      message: `${nickname}님께서 퇴장하셨습니다.`,
    };
    server.to(roomId).emit('notice', noticeData);
  }

  sendMessage(
    server: Server,
    roomId: string,
    sender: string,
    message: string
  ): void {
    const chatData: ChatDto = {
      type: 'chat',
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      message,
      sender,
    };
    server.to(roomId).emit('message', chatData);
  }
}
