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
  handleJoinRoom(
    @MessageBody() joinRoomDto: JoinRoomDto,
    @ConnectedSocket() client: Socket
  ): void {
    const { roomId, nickname } = joinRoomDto;
    this.chatService.joinRoom(this.server, client, roomId, nickname);
  }

  @SubscribeMessage('sendMessage')
  handleMessage(@MessageBody() sendMessageDto: SendMessageDto): void {
    const { roomId, sender, message } = sendMessageDto;
    this.chatService.sendMessage(this.server, roomId, sender, message);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() leaveRoomDto: LeaveRoomDto,
    @ConnectedSocket() client: Socket
  ): void {
    const { roomId, nickname } = leaveRoomDto;
    this.chatService.leaveRoom(this.server, client, roomId, nickname);
  }
}
