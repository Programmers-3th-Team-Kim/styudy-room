import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { WsException } from '@nestjs/websockets';
import { Model, Types } from 'mongoose';
import { Server, Socket } from 'socket.io';
import { Planner } from 'src/planners/planners.schema';
import { Room } from 'src/rooms/rooms.schema';
import { Statistic } from 'src/statistics/statistics.schema';
import { User } from 'src/users/users.schema';
import {
  LeaveRoomDto,
  ResponseUserInfoDTO,
  StartTimerDto,
  StopTimerDto,
  UpdateDto,
} from './dto/clientToServer.dto';
import { AllInfoDto, SocketQueryDto } from './dto/serverToClient.dto';

@Injectable()
export class SocketService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(Planner.name) private plannerModel: Model<Planner>,
    @InjectModel(Statistic.name) private statisticModel: Model<Statistic>
  ) {}

  joinChat(server: Server, roomId: string, nickname: string) {
    const noticeData = {
      message: `${nickname}님께서 입장하셨습니다.`,
      time: this.getFormmatedTime(),
    };
    server.to(roomId).emit('notice', noticeData);
  }

  leaveChat(server: Server, roomId: string, nickname: string) {
    const noticeData = {
      message: `${nickname}님께서 퇴장하셨습니다.`,
      time: this.getFormmatedTime(),
    };
    server.to(roomId).emit('notice', noticeData);
  }

  async joinRoom(
    client: Socket,
    roomId: string,
    nickname: string,
    imageUrl: string
  ): Promise<boolean> {
    const userId: string = client.data.user.sub;

    const updatedRoom = await this.roomModel.findOneAndUpdate(
      { _id: new Types.ObjectId(roomId) },
      { $push: { currentMember: new Types.ObjectId(userId) } },
      { new: true }
    );

    if (!updatedRoom) {
      console.log('스터디방이 존재하지 않습니다.');
      throw new WsException('스터디방이 존재하지 않습니다.');
    }

    client.join(roomId);

    const { roomManager, currentMember } =
      await this.getRoomManagerAndMembersToNickname(updatedRoom);

    const today = this.getFormattedDate();
    const planner = await this.plannerModel
      .find(
        {
          userId: new Types.ObjectId(userId),
          date: today,
        },
        { todo: true, isComplete: true, date: true, totalTime: true }
      )
      .lean();

    const totalTime = planner.reduce((sum, currentPlanner) => {
      return sum + currentPlanner.totalTime;
    }, 0);

    const plannerWithoutTotalTime = planner.map(
      ({ totalTime, ...rest }) => rest
    );

    const allInfo: AllInfoDto = {
      title: updatedRoom.title,
      notice: updatedRoom.notice,
      password: updatedRoom.password,
      isChat: updatedRoom.isChat,
      roomManager,
      currentMember,
      planner: plannerWithoutTotalTime,
      totalTime,
    };
    // console.log(allInfo);

    client.to(roomId).emit('getRoomAndMyInfo', allInfo);
    client.broadcast.to(roomId).emit('addMemberAndRequestUserInfo', {
      nickname,
      imageUrl,
      totalTime,
      state: 'stop',
      socketId: client.id,
    });
    return updatedRoom.isChat;
  }

  async responseUserInfo(
    server: Server,
    client: Socket,
    payload: ResponseUserInfoDTO
  ) {
    const { roomId, nickname, imageUrl } = this.getSocketQuery(client);
    const { socketId, ...userState } = payload;

    const targetSocket = server.sockets.sockets.get(socketId);

    if (!targetSocket) {
      console.log('Target socket not found');
      throw new WsException('사용자 상태 전송 실패');
    }

    targetSocket
      .to(roomId)
      .emit('responseUserInfo', { ...userState, nickname, imageUrl });
  }

  async leaveRoom(
    client: Socket,
    roomId: string,
    nickname: string,
    payload: LeaveRoomDto
  ): Promise<boolean> {
    const { isChat, planner, statistic } = payload;
    const userId: string = client.data.user.sub;

    const updatedRoom = await this.roomModel.updateOne(
      { _id: new Types.ObjectId(roomId) },
      {
        $pull: { currentMember: new Types.ObjectId(userId) },
      }
    );

    if (!updatedRoom.modifiedCount) {
      console.log(`스터디방 업데이트 실패: ${updatedRoom}`);
      throw new WsException('스터디방 업데이트 실패');
    }

    client.leave(roomId);

    const today = this.getFormattedDate();
    await this.statisticModel.updateOne(
      { date: today, userId: new Types.ObjectId(userId) },
      { ...statistic },
      { upsert: true }
    );

    planner.forEach(async (doc) => {
      const { _id, ...etcDocument } = doc;
      await this.plannerModel.updateOne({ _id }, { ...etcDocument });
    });

    client.broadcast.to(roomId).emit('subMember', { nickname });

    return isChat;
  }

  async startTimer(client: Socket, payload: StartTimerDto) {
    const { rest, state, timer } = payload;
    const { nickname, roomId } = this.getSocketQuery(client);

    const userId: string = client.data.user.sub;
    const today = this.getFormattedDate();

    await this.statisticModel.updateOne(
      { date: today, userId: new Types.ObjectId(userId) },
      { rest },
      { upsert: true }
    );

    client.broadcast
      .to(roomId)
      .emit('updateUserState', { nickname, state, timer });
  }

  async stopTimer(client: Socket, payload: StopTimerDto) {
    const { total, max, planner, timer, state } = payload;
    const { roomId, nickname } = this.getSocketQuery(client);
    const userId: string = client.data.user.sub;
    const today = this.getFormattedDate();
    const updatedStatistic = await this.statisticModel.updateOne(
      { date: today, userId: new Types.ObjectId(userId) },
      { total, max },
      { upsert: true }
    );

    if (!updatedStatistic.modifiedCount) {
      console.log(`통계 업데이트 실패: ${updatedStatistic}`);
      throw new WsException('통계 데이터 업데이트 실패');
    }

    planner.forEach(async (doc) => {
      const { _id, ...etcDocument } = doc;
      const updatedPlanner = await this.plannerModel.updateOne(
        { _id },
        { ...etcDocument }
      );
      if (!updatedPlanner.modifiedCount) {
        console.log(`플래너 업데이트 실패: ${updatedPlanner}`);
        throw new WsException('플래너 업데이트 실패');
      }
    });

    client.broadcast
      .to(roomId)
      .emit('updateUserState', { nickname, state, timer });
  }

  async updateData(client: Socket, payload: UpdateDto) {
    const { statistic, planner } = payload;
    const userId: string = client.data.user.sub;
    const today = this.getFormattedDate();

    await this.statisticModel.updateOne(
      { date: today, userId: new Types.ObjectId(userId) },
      { ...statistic },
      { upsert: true }
    );

    planner.forEach(async (doc) => {
      const { _id, ...etcDocument } = doc;
      await this.plannerModel.updateOne({ _id }, { ...etcDocument });
    });
  }

  getFormattedDate(option: number = 0): string {
    const today = new Date();
    today.setDate(today.getDate() + option);
    return today
      .toLocaleDateString('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .replace(/\s/g, '');
  }

  getFormmatedTime(): string {
    return new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  getSocketQuery(socket: Socket): SocketQueryDto {
    const roomId = socket.handshake.query.roomId as string;
    const nickname = socket.handshake.query.nickname as string;
    const imageUrl = socket.handshake.query.imageUrl as string;
    return { roomId, nickname, imageUrl };
  }

  async getRoomManagerAndMembersToNickname(room: any): Promise<any> {
    let roomManager: string;
    const currentMember = await Promise.all(
      room.currentMember.map(async (oid) => {
        const user = await this.userModel.findById(oid, {
          nickname: true,
        });
        if (user && (user._id as Types.ObjectId).equals(room.roomManager)) {
          roomManager = user.nickname;
        }
        return user.nickname; // user가 null일 경우 빈 문자열 반환
      })
    );
    return { roomManager, currentMember };
  }
}
