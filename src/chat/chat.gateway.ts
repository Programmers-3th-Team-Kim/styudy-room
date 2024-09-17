import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JoinRoomDto, LeaveRoomDto, SendMessageDto } from './dto/client.dto';
import mongoose from 'mongoose';

@WebSocketGateway({
  path: '/rooms',
  namespace: '/chat',
  // port: 5173,
  transports: ['websocket'],
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  private logger = new Logger('ChatGateWay');

  handleConnection(socket: Socket): void {
    this.logger.log(`Socket connected: ${socket.id}`);
  }

  handleDisconnect(socket: Socket): void {
    this.logger.log(`Socket disconnected: ${socket.id}`);
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() joinRoomDto: JoinRoomDto,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const { roomId, nickname } = joinRoomDto;
    // const userId = client.data.user;
    const userId = new mongoose.Types.ObjectId('66e185c81947588b7ad94b5e'); //임시 데이터
    const isChat = await this.chatService.joinRoom(
      client,
      roomId,
      userId,
      nickname
    );
    if (isChat) {
      this.chatService.joinChat(this.server, client, roomId, nickname);
    }
  }

  @SubscribeMessage('sendChat')
  handleMessage(@MessageBody() sendMessageDto: SendMessageDto): void {
    const { roomId, sender, message } = sendMessageDto;
    this.chatService.sendChat(this.server, roomId, sender, message);
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @MessageBody() leaveRoomDto: LeaveRoomDto,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const { roomId, nickname } = leaveRoomDto;
    // const userId = client.data.user;
    const userId = new mongoose.Types.ObjectId('66e185c81947588b7ad94b5e'); //임시 데이터
    const isChat = await this.chatService.leaveRoom(client, roomId, userId);
    if (isChat) {
      this.chatService.leaveChat(this.server, client, roomId, nickname);
    }
  }
}
