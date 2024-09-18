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
      this.chatService.joinChat(this.server, roomId, nickname);
    }
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @MessageBody() leaveRoomDto: any,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const { roomId, nickname } = leaveRoomDto; // + planner, studyTime
    // const userId = client.data.user;
    // 임시데이터
    const planner = {
      _id: new mongoose.Types.ObjectId('66e70d0f45d157eca69a9cf7'),
      todo: 'todo1',
      isComplete: true,
      date: '2024-09-16',
      afterTime: [
        {
          startTime: '09:10',
          endTime: '10:10',
        },
      ],
    };
    const userId = new mongoose.Types.ObjectId('66e185c81947588b7ad94b5e'); //임시 데이터
    const isChat = await this.chatService.leaveRoom(
      client,
      roomId,
      userId,
      planner
    );
    if (isChat) {
      this.chatService.leaveChat(this.server, roomId, nickname);
    }
  }

  @SubscribeMessage('sendChat')
  handleMessage(@MessageBody() sendMessageDto: SendMessageDto): void {
    const { roomId, sender, message } = sendMessageDto;
    this.chatService.sendChat(this.server, roomId, sender, message);
  }

  @SubscribeMessage('startTimer')
  handleStartTimer(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket
  ): void {
    const { roomId, totalTime, maxTime, subjectTime } = payload;
    const userId = new mongoose.Types.ObjectId('66e185c81947588b7ad94b5e'); //임시 데이터
    this.chatService.startTimer(
      client,
      roomId,
      totalTime,
      maxTime,
      subjectTime,
      userId
    );
  }

  @SubscribeMessage('stopTimer')
  handleStopTimer(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket
  ): void {
    const { roomId, totalTime, restTime } = payload;
    const userId = new mongoose.Types.ObjectId('66e185c81947588b7ad94b5e'); //임시 데이터
    this.chatService.stopTimer(client, roomId, restTime, totalTime, userId);
  }
}
