import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { WsException } from '@nestjs/websockets';
import { Model, Types } from 'mongoose';
import { Server, Socket } from 'socket.io';
import { Planner } from 'src/planners/planners.schema';
import { Room } from 'src/rooms/rooms.schema';
import { Statistic } from 'src/statistics/statistics.schema';
import { User } from 'src/users/users.schema';

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

  async joinRoom(client: Socket, roomId: string, nickname: string) {
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

    const roomData = await this.roomModel.findById(new Types.ObjectId(roomId));

    let roomManager: string;
    const currentMember = await Promise.all(
      roomData.currentMember.map(async (oid) => {
        const user = await this.userModel.findById(oid, {
          nickname: true,
        });
        if (user && (user._id as Types.ObjectId).equals(roomData.roomManager)) {
          roomManager = user.nickname;
        }
        return user.nickname;
      })
    );

    const yesterday = this.getFormattedDate(-1);
    const tomorrow = this.getFormattedDate(+1);
    const plannerData = await this.plannerModel.find(
      {
        userId: new Types.ObjectId(userId),
        date: { $gte: yesterday, $lte: tomorrow },
      },
      { todo: true, isComplete: true, date: true, timeLineList: true }
    );

    const roomInfoData = {
      title: roomData.title,
      notice: roomData.notice,
      password: roomData.password,
      isChat: roomData.isChat,
      roomManager,
      currentMember,
      palnner: plannerData,
    };

    client.to(roomId).emit('responseRoomInfo', roomInfoData);
    client.broadcast
      .to(roomId)
      .emit('updateMember', { nickname, state: 'join' });
    client.broadcast
      .to(roomId)
      .emit('requestUserInfo', { socketId: client.id });
    return roomData.isChat;
  }

  async leaveRoom(
    client: Socket,
    roomId: string,
    nickname: string,
    statisticData: any,
    plannerData: any
  ) {
    const userId: string = client.data.user.sub;

    const updatedRoom = await this.roomModel.updateOne(
      { _id: new Types.ObjectId(roomId) },
      {
        $inc: { currentNum: -1 },
        $pull: { currentMember: new Types.ObjectId(userId) },
      }
    );

    if (!updatedRoom.modifiedCount) {
      throw new WsException('스터디방 데이터 업데이트 실패');
    }

    client.leave(roomId);

    const today = this.getFormattedDate();
    const updatedStatistic = await this.statisticModel.updateOne(
      { date: today, userId },
      { ...statisticData },
      { upsert: true }
    );

    if (!updatedStatistic.modifiedCount) {
      throw new WsException('통계 데이터 업데이트 실패');
    }

    const { _id, ...etcPlannerData } = plannerData;
    const updatedPlanner = await this.plannerModel.updateOne(
      { _id },
      { ...etcPlannerData }
    );

    if (!updatedPlanner.modifiedCount) {
      throw new WsException('통계 데이터 업데이트 실패');
    }

    client.broadcast
      .to(roomId)
      .emit('updateMember', { nickname, state: 'leave' });
  }

  async startTimer(
    client: Socket,
    restTime: number,
    roomId: string,
    nickname: string,
    state: string,
    timer: number
  ) {
    const today = this.getFormattedDate();
    const updatedStatistic = await this.statisticModel.updateOne(
      { date: today },
      { rest: restTime },
      { upsert: true }
    );

    if (!updatedStatistic.modifiedCount) {
      throw new WsException('통계 데이터 업데이트 실패');
    }

    client.broadcast
      .to(roomId)
      .emit('updateUserState', { nickname, state, timer });
  }

  async stopTimer(
    client: Socket,
    roomId: string,
    totalTime: number,
    maxTime: number,
    plannerData: any,
    nickname: string,
    state: string,
    timer: number
  ) {
    const today = this.getFormattedDate();
    const updatedStatistic = await this.statisticModel.updateOne(
      { date: today },
      { total: totalTime, max: maxTime },
      { upsert: true }
    );

    if (!updatedStatistic.modifiedCount) {
      throw new WsException('통계 데이터 업데이트 실패');
    }

    const { _id, ...etcPlannerData } = plannerData;
    const updatedPlanner = await this.plannerModel.updateOne(
      { _id },
      { etcPlannerData }
    );
    console.log(updatedPlanner);

    client.broadcast
      .to(roomId)
      .emit('updateUserState', { nickname, state, timer });
  }

  async updateData(
    totalTime: number,
    maxTime: number,
    restTime: number,
    plannerData: any
  ) {
    const today = this.getFormattedDate();

    const updatedStatistic = await this.statisticModel.updateOne(
      { date: today },
      { total: totalTime, max: maxTime, rest: restTime },
      { upsert: true }
    );

    if (!updatedStatistic.modifiedCount) {
      throw new WsException('통계 데이터 업데이트 실패');
    }

    const { _id, ...etcPlannerData } = plannerData;
    const updatedPlanner = await this.plannerModel.updateOne(
      { _id },
      { etcPlannerData }
    );
    console.log(updatedPlanner);
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
}
