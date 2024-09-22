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
  PlannerDto,
  StatisticDto,
  UserStateDto,
} from './dto/clientToServer.dto';
import { RoomInfoDto } from './dto/serverToClient.dto';

@Injectable()
export class SocketService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(Planner.name) private plannerModel: Model<Planner>,
    @InjectModel(Statistic.name) private statisticModel: Model<Statistic>
  ) {}

  joinChat(server: Server, roomId: string, nickname: string): void {
    const noticeData = {
      type: 'notice',
      message: `${nickname}님께서 입장하셨습니다.`,
    };
    server.to(roomId).emit('notice', noticeData);
  }

  leaveChat(server: Server, roomId: string, nickname: string): void {
    const noticeData = {
      type: 'notice',
      message: `${nickname}님께서 퇴장하셨습니다.`,
    };
    server.to(roomId).emit('notice', noticeData);
  }

  async joinRoom(
    client: Socket,
    roomId: string,
    nickname: string
  ): Promise<boolean> {
    const userId: string = client.data.user.sub;

    const updatedRoom = await this.roomModel.updateOne(
      { _id: new Types.ObjectId(roomId) },
      {
        $inc: { currentNum: 1 },
        $push: { currentMember: new Types.ObjectId(userId) },
      }
    );

    if (!updatedRoom.modifiedCount) {
      console.log('스터디방 데이터 업데이트 실패');
      throw new WsException('스터디방 데이터 업데이트 실패');
    }

    client.join(roomId);

    const room = await this.roomModel.findById(new Types.ObjectId(roomId));

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

    const yesterday = this.getFormattedDate(-1);
    const tomorrow = this.getFormattedDate(+1);
    const planner = await this.plannerModel.find(
      {
        userId: new Types.ObjectId(userId),
        date: { $gte: yesterday, $lte: tomorrow },
      },
      { todo: true, isComplete: true, date: true, timeLineList: true }
    );

    const roomInfo: RoomInfoDto = {
      title: room.title,
      notice: room.notice,
      password: room.password,
      isChat: room.isChat,
      roomManager,
      currentMember,
      planner,
    };

    client.to(roomId).emit('RoomInfo', roomInfo);
    client.broadcast
      .to(roomId)
      .emit('updateMember', { nickname, state: 'join' });
    client.broadcast
      .to(roomId)
      .emit('requestUserInfo', { socketId: client.id });
    return room.isChat;
  }

  async leaveRoom(
    client: Socket,
    roomId: string,
    nickname: string,
    statistic: StatisticDto,
    planner: PlannerDto[]
  ): Promise<boolean> {
    const userId: string = client.data.user.sub;

    const updatedRoom = await this.roomModel.updateOne(
      { _id: new Types.ObjectId(roomId) },
      {
        $inc: { currentNum: -1 },
        $pull: { currentMember: new Types.ObjectId(userId) },
      }
    );

    if (!updatedRoom.modifiedCount) {
      console.log(`스터디방 업데이트 실패: ${updatedRoom}`);
      throw new WsException('스터디방 업데이트 실패');
    }

    client.leave(roomId);

    const today = this.getFormattedDate();
    const updatedStatistic = await this.statisticModel.updateOne(
      { date: today, userId: new Types.ObjectId(userId) },
      { ...statistic },
      { upsert: true }
    );

    // if (!updatedStatistic.modifiedCount) {
    //   console.log(`통계 업데이트 실패: ${updatedStatistic}`);
    //   throw new WsException('통계 업데이트 실패');
    // }

    planner.forEach(async (doc) => {
      const { _id, ...etcDocument } = doc;
      const updatedPlanner = await this.plannerModel.updateOne(
        { _id },
        { ...etcDocument }
      );
      // if (!updatedPlanner.modifiedCount) {
      //   console.log(`플래너 업데이트 실패: ${updatedPlanner}`);
      //   throw new WsException('플래너 업데이트 실패');
      // }
    });

    const { isChat } = await this.roomModel.findById(
      new Types.ObjectId(roomId),
      {
        _id: false,
        isChat: true,
      }
    );

    client.broadcast
      .to(roomId)
      .emit('updateMember', { nickname, state: 'leave' });

    return isChat;
  }

  async startTimer(
    client: Socket,
    restTime: number,
    roomId: string,
    userState: UserStateDto
  ) {
    const userId: string = client.data.user.sub;
    const today = this.getFormattedDate();
    const updatedStatistic = await this.statisticModel.updateOne(
      { date: today, userId: new Types.ObjectId(userId) },
      { rest: restTime },
      { upsert: true }
    );

    // if (!updatedStatistic.modifiedCount) {
    //   console.log(`통계 업데이트 실패: ${updatedStatistic}`);
    //   throw new WsException('통계 데이터 업데이트 실패');
    // }

    client.broadcast.to(roomId).emit('updateUserState', userState);
  }

  async stopTimer(
    client: Socket,
    roomId: string,
    totalTime: number,
    maxTime: number,
    planner: PlannerDto[],
    userState: UserStateDto
  ) {
    const userId: string = client.data.user.sub;
    const today = this.getFormattedDate();
    const updatedStatistic = await this.statisticModel.updateOne(
      { date: today, userId: new Types.ObjectId(userId) },
      { total: totalTime, max: maxTime },
      { upsert: true }
    );

    // if (!updatedStatistic.modifiedCount) {
    //   console.log(`통계 업데이트 실패: ${updatedStatistic}`);
    //   throw new WsException('통계 데이터 업데이트 실패');
    // }

    planner.forEach(async (doc) => {
      const { _id, ...etcDocument } = doc;
      const updatedPlanner = await this.plannerModel.updateOne(
        { _id },
        { ...etcDocument }
      );
      // if (!updatedPlanner.modifiedCount) {
      //   console.log(`플래너 업데이트 실패: ${updatedPlanner}`);
      //   throw new WsException('플래너 업데이트 실패');
      // }
    });

    client.broadcast.to(roomId).emit('updateUserState', userState);
  }

  async updateData(
    client: Socket,
    totalTime: number,
    maxTime: number,
    restTime: number,
    planner: PlannerDto[]
  ) {
    const userId: string = client.data.user.sub;
    const today = this.getFormattedDate();

    const updatedStatistic = await this.statisticModel.updateOne(
      { date: today, userId: new Types.ObjectId(userId) },
      { total: totalTime, max: maxTime, rest: restTime },
      { upsert: true }
    );

    // if (!updatedStatistic.modifiedCount) {
    //   throw new WsException('통계 데이터 업데이트 실패');
    // }

    planner.forEach(async (doc) => {
      const { _id, ...etcDocument } = doc;
      const updatedPlanner = await this.plannerModel.updateOne(
        { _id },
        { ...etcDocument }
      );
      // if (!updatedPlanner.modifiedCount) {
      //   console.log(`플래너 업데이트 실패: ${updatedPlanner}`);
      //   throw new WsException('플래너 업데이트 실패');
      // }
    });
  }

  getFormattedDate(option: number = 0): string {
    const today = new Date();
    today.setDate(today.getDate() + option);
    return today
      .toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .replace(/\s/g, '');
  }

  getRoomId(socket: Socket): string {
    return socket.handshake.query.roomId as string;
  }
}
