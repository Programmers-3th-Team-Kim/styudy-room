import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { SocketService } from './socket.service';
import { Socket, Server } from 'socket.io';
import { SocketJwtAuthService } from 'src/auth/socketJwtAuth.service';
import { UseFilters } from '@nestjs/common';
import { WebSocketExceptionFilter } from './socketExceptionFilter';

@WebSocketGateway({
  path: '/rooms',
  namespace: '/studyRoom',
  // port: 5173,
  transports: ['websocket'],
  cors: { origin: '*' },
})
@UseFilters(new WebSocketExceptionFilter())
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly socketService: SocketService,
    private readonly socketJwtAuthService: SocketJwtAuthService
  ) {}

  async handleConnection(client: Socket) {
    const isValid = await this.socketJwtAuthService.validateSocket(client);
    if (!isValid) {
      client.disconnect();
    } else {
      console.log(`Client connected: ${client.data.user.sub}`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.data.user.sub}`);
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket
  ) {
    const { roomId, nickname } = payload;
    const isChat = await this.socketService.joinRoom(client, roomId, nickname);
    if (isChat) {
      this.socketService.joinChat(this.server, roomId, nickname);
    }
  }

  @SubscribeMessage('responseUserInfo')
  responseuserInfo(@MessageBody() payload: any) {
    const { socketId, nickname, timer, state, roomId } = payload;
    const targetSocket = this.server.sockets.sockets.get(socketId);

    if (targetSocket) {
      targetSocket
        .to(roomId)
        .emit('updateUserState', { nickname, timer, state });
    } else {
      console.log('Target socket not found');
      throw new WsException('사용자 상태 전송 실패');
    }
  }

  @SubscribeMessage('leaveRoom')
  async leaveRoom(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket
  ) {
    const { statisticData, plannerData, roomId, nickname, isChat } = payload;
    await this.socketService.leaveRoom(
      client,
      roomId,
      nickname,
      statisticData,
      plannerData
    );
    if (isChat) {
      this.socketService.leaveChat(this.server, roomId, nickname);
    }
  }

  @SubscribeMessage('sendChat')
  handleMessage(@MessageBody() payload: any) {
    const { roomId, sender, message } = payload;
    const chatData = {
      type: 'chat',
      time: new Date().toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      message,
      sender,
    };
    this.server.to(roomId).emit('chat', chatData);
  }

  @SubscribeMessage('startTimer')
  startTimer(@MessageBody() payload: any, @ConnectedSocket() client: Socket) {
    const { restTime, roomId, nickname, state, timer } = payload;
    this.socketService.startTimer(
      client,
      restTime,
      roomId,
      nickname,
      state,
      timer
    );
  }

  @SubscribeMessage('stopTimer')
  stopTimer(@MessageBody() payload: any, @ConnectedSocket() client: Socket) {
    const { totalTime, roomId, maxTime, plannerData, nickname, state, timer } =
      payload;
    this.socketService.stopTimer(
      client,
      roomId,
      totalTime,
      maxTime,
      plannerData,
      nickname,
      state,
      timer
    );
  }

  @SubscribeMessage('updateData')
  updateData(@MessageBody() payload: any) {
    const { totalTime, maxTime, restTime, plannerData } = payload;
    this.socketService.updateData(totalTime, maxTime, restTime, plannerData);
  }
}
