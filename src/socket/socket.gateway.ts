import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { SocketService } from './socket.service';
import { Socket, Server } from 'socket.io';
import { SocketJwtAuthService } from 'src/auth/socketJwtAuth.service';
import {
  LeaveRoomDto,
  ResponseUserInfoDTO,
  SendChatDto,
  StopTimerDto,
  UpdateDto,
} from './dto/clientToServer.dto';
import {
  CreatePlannerDto,
  getPlannerDto,
  ModifyPlanner,
} from './dto/planner.dto';

@WebSocketGateway({
  namespace: '/rooms',
  transports: ['websocket'],
  cors: { origin: '*' },
})
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
      return;
    }
    console.log(`Client connected: ${client.data.user.sub}`);

    const { roomId, nickname, imageUrl } =
      this.socketService.getSocketQuery(client);
    try {
      const room = await this.socketService.joinRoom(client, roomId);
      const allInfo = await this.socketService.getRoomAndMyInfo(client, room);

      client.emit('getRoomAndMyInfo', allInfo);
      client.broadcast.to(roomId).emit('addMemberAndRequestUserInfo', {
        nickname,
        imageUrl,
        totalTime: allInfo.totalTime,
        state: 'stop',
        socketId: client.id,
      });

      if (room.isChat) {
        this.socketService.joinChat(this.server, roomId, nickname);
      }
    } catch (error) {
      console.log(error);
      // client.to(roomId).emit('error', { error: error.message });
      client.emit('error', { error: error.message });
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.user) {
      console.log(`Client disconnected: ${client.data.user.sub}`);
      return;
    }
    console.log('Client disconnected');
  }

  @SubscribeMessage('responseUserInfo')
  responseUserInfo(
    @MessageBody() payload: ResponseUserInfoDTO,
    @ConnectedSocket() client: Socket
  ) {
    const { socketId, ...userState } = payload;

    const { nickname, imageUrl } = this.socketService.getSocketQuery(client);

    this.server
      .to(socketId)
      .emit('responseUserInfo', { nickname, imageUrl, ...userState });
  }

  // 작업 필요
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
    console.log(chatData);
    // client.emit('receiveChat', chatData);
    client.broadcast.to(roomId).emit('receiveChat', chatData);
    client.emit('responseChat', { success: true });
  }

  // 작업 필요
  @SubscribeMessage('start')
  start(@MessageBody() payload: any, @ConnectedSocket() client: Socket) {
    this.socketService.start(client, payload);
  }

  // 작업 필요
  @SubscribeMessage('stopTimer')
  stopTimer(
    @MessageBody() payload: StopTimerDto,
    @ConnectedSocket() client: Socket
  ) {
    this.socketService.stopTimer(client, payload);
  }

  // 작업 필요
  @SubscribeMessage('updateData')
  updateData(
    @MessageBody() payload: UpdateDto,
    @ConnectedSocket() client: Socket
  ) {
    this.socketService.updateData(client, payload);
  }

  @SubscribeMessage('getPlanner')
  async getPlanner(
    @MessageBody() payload: getPlannerDto,
    @ConnectedSocket() client: Socket
  ) {
    const { date } = payload;
    const { roomId } = this.socketService.getSocketQuery(client);

    try {
      const planner = await this.socketService.getPlanner(client, date);
      // client.to(roomId).emit('responseGetPlanner', planner);
      client.emit('responseGetPlanner', planner);
    } catch (error) {
      console.log(error);
      // client.to(roomId).emit('error', { error: error.message });
      client.emit('error', { error: error.message });
    }
  }

  @SubscribeMessage('createPlanner')
  async createPlanner(
    @MessageBody() payload: CreatePlannerDto,
    @ConnectedSocket() client: Socket
  ) {
    const { roomId } = this.socketService.getSocketQuery(client);
    try {
      const planner = await this.socketService.createPlanner(payload, client);
      console.log(planner);
      // client.to(roomId).emit('responseCreateTodo', planner);
      client.emit('responseCreateTodo', planner);
    } catch (error) {
      console.log(error);
      // client.to(roomId).emit('error', { error: error.message });
      client.emit('error', { error: error.message });
    }
  }

  @SubscribeMessage('modifyPlanner')
  async modifyPlanner(
    @MessageBody() payload: ModifyPlanner,
    @ConnectedSocket() client: Socket
  ) {
    const { roomId } = this.socketService.getSocketQuery(client);

    try {
      const planner = await this.socketService.modifyPlanner(payload);
      // client.to(roomId).emit('responseUpdatePlanner', planner);
      console.log(planner);
      client.emit('responseUpdatePlanner', planner);
    } catch (error) {
      console.log(error);
      // client.to(roomId).emit('error', { error: error.message });
      client.emit('error', { error: error.message });
    }
  }
}
