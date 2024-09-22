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
import {
  JoinRoomDto,
  LeaveRoomDto,
  ResponseUserInfoDTO,
  SendChatDto,
  StartTimerDto,
  StopTimerDto,
  UpdateDto,
} from './dto/clientToServer.dto';

@WebSocketGateway({
  // path: '/rooms',
  namespace: '/rooms',
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
    @MessageBody() payload: JoinRoomDto,
    @ConnectedSocket() client: Socket
  ) {
    const { nickname } = payload;
    const roomId = this.socketService.getRoomId(client);
    const isChat = await this.socketService.joinRoom(client, roomId, nickname);
    if (isChat) {
      this.socketService.joinChat(this.server, roomId, nickname);
    }
  }

  @SubscribeMessage('responseUserInfo')
  responseuserInfo(
    @MessageBody() payload: ResponseUserInfoDTO,
    @ConnectedSocket() client: Socket
  ) {
    const { socketId, ...userState } = payload;
    const roomId = this.socketService.getRoomId(client);
    const targetSocket = this.server.sockets.sockets.get(socketId);

    if (!targetSocket) {
      console.log('Target socket not found');
      throw new WsException('사용자 상태 전송 실패');
    }

    targetSocket.to(roomId).emit('updateUserState', userState);
  }

  @SubscribeMessage('leaveRoom')
  async leaveRoom(
    @MessageBody() payload: LeaveRoomDto,
    @ConnectedSocket() client: Socket
  ) {
    const { statistic, planner, nickname } = payload;
    const roomId = this.socketService.getRoomId(client);
    const isChat = await this.socketService.leaveRoom(
      client,
      roomId,
      nickname,
      statistic,
      planner
    );
    if (isChat) {
      this.socketService.leaveChat(this.server, roomId, nickname);
    }
  }

  @SubscribeMessage('sendChat')
  handleMessage(
    @MessageBody() payload: SendChatDto,
    @ConnectedSocket() client: Socket
  ) {
    const { nickname, message } = payload;
    const roomId = this.socketService.getRoomId(client);
    const chatData = {
      type: 'chat',
      time: new Date().toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      message,
      nickname,
    };
    this.server.to(roomId).emit('chat', chatData);
  }

  @SubscribeMessage('startTimer')
  startTimer(
    @MessageBody() payload: StartTimerDto,
    @ConnectedSocket() client: Socket
  ) {
    const { restTime, ...userState } = payload;
    const roomId = this.socketService.getRoomId(client);
    this.socketService.startTimer(client, restTime, roomId, userState);
  }

  @SubscribeMessage('stopTimer')
  stopTimer(
    @MessageBody() payload: StopTimerDto,
    @ConnectedSocket() client: Socket
  ) {
    const { totalTime, maxTime, planner, ...userState } = payload;
    const roomId = this.socketService.getRoomId(client);
    this.socketService.stopTimer(
      client,
      roomId,
      totalTime,
      maxTime,
      planner,
      userState
    );
  }

  @SubscribeMessage('updateData')
  updateData(
    @MessageBody() payload: UpdateDto,
    @ConnectedSocket() client: Socket
  ) {
    const { totalTime, maxTime, restTime, planner } = payload;
    this.socketService.updateData(
      client,
      totalTime,
      maxTime,
      restTime,
      planner
    );
  }
}
