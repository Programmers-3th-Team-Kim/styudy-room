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
  StopTimerDto,
  UpdateDto,
} from './dto/clientToServer.dto';
import { RoomAndMyInfo, SocketQueryDto } from './dto/serverToClient.dto';
import {
  CreatePlannerDto,
  ModifyPlanner,
  SPlannerDto,
} from './dto/planner.dto';
import { Temp } from './temps.schema';

@Injectable()
export class SocketService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(Planner.name) private plannerModel: Model<Planner>,
    @InjectModel(Statistic.name) private statisticModel: Model<Statistic>,
    @InjectModel(Temp.name) private tempModel: Model<Temp>
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

  async joinRoom(client: Socket, roomId: string): Promise<Room> {
    const userId: string = client.data.user.sub;

    const roomExists = await this.roomModel.findById(roomId);
    if (!roomExists) {
      throw new WsException('스터디방이 존재하지 않습니다.');
    }

    const updatedRoom = await this.roomModel.findOneAndUpdate(
      { _id: new Types.ObjectId(roomId) },
      { $push: { currentMember: new Types.ObjectId(userId) } },
      { new: true }
    );

    client.join(roomId);

    return updatedRoom;
  }

  async getRoomAndMyInfo(client: Socket, room: any): Promise<RoomAndMyInfo> {
    const userId: string = client.data.user.sub;
    const { roomManager, currentMember } =
      await this.getRoomManagerAndMembersToNickname(room);

    const today = this.getFormattedDate();
    const planner = await this.getPlanner(client, today);

    const { totalTime } = await this.statisticModel.findOne(
      { date: today, userId: new Types.ObjectId(userId) },
      { _id: false, totalTime: true },
      { upsert: true }
    );

    const allInfo: RoomAndMyInfo = {
      title: room.title,
      notice: room.notice,
      password: room.password,
      isChat: room.isChat,
      roomManager,
      currentMember,
      planner,
      totalTime,
    };

    return allInfo;
  }

  // 작업 필요
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

  // 작업 필요
  async start(client: Socket, payload: any) {
    const { plannerId, time } = payload;
    const userId: string = client.data.user.sub;

    const temp = await this.tempModel.create({
      plannerId: new Types.ObjectId(plannerId),
      userId: new Types.ObjectId(userId),
      maxStartTime: time,
    });
    console.log(temp);
  }

  // 작업 필요
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

  // 작업 필요
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

  async getPlanner(client: Socket, date: string): Promise<SPlannerDto[]> {
    const userId: string = client.data.user.sub;

    const yesterday = this.getFormattedDate(-1);
    const tomorrow = this.getFormattedDate(+1);

    if (!(yesterday <= date && date <= tomorrow)) {
      console.log('플래너를 불러올 수 없습니다.');
      throw new WsException('플래너를 불러올 수 없습니다.');
    }
    const planner = await this.plannerModel.find(
      { date, userId: new Types.ObjectId(userId) },
      { todo: true, isComplete: true, date: true, totalTime: true }
    );

    return planner;
  }

  async createPlanner(
    payload: CreatePlannerDto,
    client: Socket
  ): Promise<SPlannerDto> {
    const { date, todo } = payload;
    const userId: string = client.data.user.sub;

    const planner = await this.plannerModel.create({
      date,
      todo,
      userId: new Types.ObjectId(userId),
    });

    const response = {
      _id: planner._id,
      date: planner.date,
      todo: planner.todo,
      isComplete: planner.isComplete,
      totalTime: planner.totalTime,
    };

    return response;
  }

  async modifyPlanner(payload: ModifyPlanner): Promise<SPlannerDto> {
    const { plannerId, todo, isComplete } = payload;

    const updateFields: any = {};
    if (todo !== undefined) {
      updateFields.todo = todo;
    }
    if (isComplete !== undefined) {
      updateFields.isComplete = isComplete;
    }

    const planner = await this.plannerModel.findOneAndUpdate(
      { _id: new Types.ObjectId(plannerId) },
      updateFields,
      { new: true }
    );

    if (!planner) {
      throw new WsException('플래너를 찾을 수 없습니다.');
    }

    const response = {
      _id: planner._id,
      date: planner.date,
      todo: planner.todo,
      isComplete: planner.isComplete,
      totalTime: planner.totalTime,
    };

    return response;
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
        return user.nickname;
      })
    );
    return { roomManager, currentMember };
  }
}
