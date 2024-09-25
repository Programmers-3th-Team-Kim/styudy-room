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
  LeaveRoomDto,
  ResponseUserInfoDTO,
  SendChatDto,
  StartTimerDto,
  StopTimerDto,
  UpdateDto,
} from './dto/clientToServer.dto';

@WebSocketGateway({
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
      throw new WsException('jwt token 인증 실패');
    }
    console.log(`Client connected: ${client.data.user.sub}`);

    const { roomId, nickname, imageUrl } =
      this.socketService.getSocketQuery(client);
    const isChat: boolean = await this.socketService.joinRoom(
      client,
      roomId,
      nickname,
      imageUrl
    );
    if (isChat) {
      this.socketService.joinChat(this.server, roomId, nickname);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.data.user.sub}`);
  }

  @SubscribeMessage('responseUserInfo')
  async responseUserInfo(
    @MessageBody() payload: ResponseUserInfoDTO,
    @ConnectedSocket() client: Socket
  ) {
    this.socketService.responseUserInfo(this.server, client, payload);
  }

  @SubscribeMessage('leaveRoom')
  async leaveRoom(
    @MessageBody() payload: LeaveRoomDto,
    @ConnectedSocket() client: Socket
  ) {
    const { roomId, nickname } = this.socketService.getSocketQuery(client);
    const isChat: boolean = await this.socketService.leaveRoom(
      client,
      roomId,
      nickname,
      payload
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
    const { message } = payload;
    const { nickname, roomId, imageUrl } =
      this.socketService.getSocketQuery(client);
    const chatData = {
      time: this.socketService.getFormmatedTime(),
      message,
      nickname,
      imageUrl,
    };
    client.broadcast.to(roomId).emit('receiveChat', chatData);
    client.to(roomId).emit('responseChat', { success: true });
  }

  @SubscribeMessage('startTimer')
  startTimer(
    @MessageBody() payload: StartTimerDto,
    @ConnectedSocket() client: Socket
  ) {
    this.socketService.startTimer(client, payload);
  }

  @SubscribeMessage('stopTimer')
  stopTimer(
    @MessageBody() payload: StopTimerDto,
    @ConnectedSocket() client: Socket
  ) {
    this.socketService.stopTimer(client, payload);
  }

  @SubscribeMessage('updateData')
  updateData(
    @MessageBody() payload: UpdateDto,
    @ConnectedSocket() client: Socket
  ) {
    this.socketService.updateData(client, payload);
  }
}
