import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { WsException } from '@nestjs/websockets';
import { Model, Types, UpdateWriteOpResult } from 'mongoose';
import { Server, Socket } from 'socket.io';
import { Planner } from 'src/planners/planners.schema';
import { Room } from 'src/rooms/rooms.schema';
import { Statistic } from 'src/statistics/statistics.schema';
import { User } from 'src/users/users.schema';
import { PayloadDto } from './dto/clientToServer.dto';
import {
  convertDateNumberToStringDto,
  SocketQueryDto,
} from './dto/serverToClient.dto';
import {
  CreatePlannerDto,
  ModifyPlanner,
  SPlannerDto,
} from './dto/planner.dto';
import { Temp } from './temps.schema';
import { RoomAndMyInfo } from './dto/joinRoom.dto';

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
      { $addToSet: { currentMember: new Types.ObjectId(userId) } },
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

    const statistic = await this.statisticModel.findOne(
      { date: today, userId: new Types.ObjectId(userId) },
      { _id: false, totalTime: true }
    );

    const { totalTime = 0 } = statistic || {};

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

  async save(client: Socket, currentTime: number) {
    const userId: string = client.data.user.sub;

    const today = this.getFormattedDate();

    const temp = await this.findTemp(userId);

    await this.tempModel.deleteMany({ userId: new Types.ObjectId(userId) });

    if (!temp || !temp.maxStartTime) {
      console.log('입장 후 바로 종료 or 정지 후 종료');
      return;
    }

    await this.splitTimeIntoIntervals(
      userId,
      temp.plannerStartTime,
      currentTime
    );

    if (today !== temp.date) {
      const time0 = this.getStartOfDayTimestamp(currentTime);

      const startTime = this.convertDateNumberToString(temp.plannerStartTime);
      const endTime = this.convertDateNumberToString(time0);
      const todoTotal = time0 - temp.plannerStartTime;
      const updatePlannerFields = {
        $push: {
          timelineList: {
            startTime: { date: startTime.date, time: startTime.time },
            endTime: { date: endTime.date, time: endTime.time },
          },
        },
        $inc: { totalTime: todoTotal },
      };
      const planner = await this.updatePlanner(
        temp.plannerId,
        updatePlannerFields
      );

      const newPlanner = await this.plannerModel.create({
        todo: planner.todo,
        date: today,
        userId: new Types.ObjectId(userId),
      });

      const updateStatisticFields = {
        $inc: { totalTime: todoTotal },
      };
      await this.updateStatistic(userId, temp.date, updateStatisticFields);

      await this.tempModel.updateOne(
        { userId: new Types.ObjectId(userId) },
        { date: today }
      );

      temp.plannerId = newPlanner._id;
      temp.plannerStartTime = time0;
    }

    const startTime = this.convertDateNumberToString(temp.plannerStartTime);
    const endTime = this.convertDateNumberToString(currentTime);
    const todoTotal = currentTime - temp.plannerStartTime;
    const updatePlannerFields = {
      $push: {
        timelineList: {
          startTime: { date: startTime.date, time: startTime.time },
          endTime: { date: endTime.date, time: endTime.time },
        },
      },
      $inc: { totalTime: todoTotal },
    };
    await this.updatePlanner(temp.plannerId, updatePlannerFields);

    const maxTime = currentTime - temp.maxStartTime;
    const updateStatisticFields = {
      $inc: { totalTime: todoTotal },
      $max: { maxTime },
    };
    await this.updateStatistic(userId, today, updateStatisticFields);
  }

  async leaveRoom(client: Socket, roomId: string) {
    const userId: string = client.data.user.sub;

    const roomExists = await this.roomModel.findById(roomId);
    if (!roomExists) {
      throw new WsException('스터디방이 존재하지 않습니다.');
    }

    const updatedRoom = await this.roomModel.findOneAndUpdate(
      { _id: new Types.ObjectId(roomId) },
      { $pull: { currentMember: new Types.ObjectId(userId) } }
    );

    if (!updatedRoom.currentMember.length) {
      await this.roomModel.deleteOne({
        _id: new Types.ObjectId(roomId),
      });
    }

    client.leave(roomId);

    return updatedRoom;
  }

  async start(client: Socket, payload: PayloadDto) {
    const { currentTime, totalTime } = payload;
    let plannerId = payload.plannerId;
    const userId: string = client.data.user.sub;
    const { roomId, nickname } = this.getSocketQuery(client);

    const today = this.getFormattedDate();

    const temp = await this.findTemp(userId);

    if (temp) {
      if (!temp.restStartTime) {
        console.log('시작 중복 실행');
        return;
      }

      if (today !== temp.date) {
        const time0 = this.getStartOfDayTimestamp(currentTime);

        const planner = await this.plannerModel.findById(plannerId);

        const newPlanner = await this.plannerModel.create({
          todo: planner.todo,
          date: today,
          userId: new Types.ObjectId(userId),
        });

        const restTime = time0 - temp.restStartTime;
        const updateStatisticFields = {
          $inc: { restTime },
        };
        await this.updateStatistic(userId, temp.date, updateStatisticFields);

        await this.tempModel.updateOne(
          { userId: new Types.ObjectId(userId) },
          { date: today }
        );

        plannerId = newPlanner._id.toString();
        temp.restStartTime = time0;
      }

      const restTime = currentTime - temp.restStartTime;
      const updateStatisticFields = {
        $inc: { restTime },
      };
      await this.updateStatistic(userId, today, updateStatisticFields);
    }

    const updatedtemp = await this.tempModel.updateOne(
      {
        userId: new Types.ObjectId(userId),
      },
      {
        plannerId: new Types.ObjectId(plannerId),
        maxStartTime: currentTime,
        plannerStartTime: currentTime,
        restStartTime: 0,
      },
      {
        upsert: true,
      }
    );

    if (!updatedtemp) {
      throw new WsException('시작 에러');
    }

    client.broadcast
      .to(roomId)
      .emit('updateUserState', { nickname, totalTime, state: 'start' });
  }

  async stop(client: Socket, payload: PayloadDto) {
    const { currentTime, totalTime } = payload;
    let plannerId = payload.plannerId;
    const { roomId, nickname } = this.getSocketQuery(client);
    const userId: string = client.data.user.sub;

    const today = this.getFormattedDate();

    const temp = await this.findTemp(userId);

    if (!temp || !temp.maxStartTime) {
      console.log('일시정지 중복 실행');
      return;
    }

    if (temp.plannerId.toString() !== plannerId) {
      throw new WsException('일시정지 에러');
    }

    await this.splitTimeIntoIntervals(
      userId,
      temp.plannerStartTime,
      currentTime
    );

    if (today !== temp.date) {
      const time0 = this.getStartOfDayTimestamp(currentTime);

      const startTime = this.convertDateNumberToString(temp.plannerStartTime);
      const endTime = this.convertDateNumberToString(time0);
      const todoTotal = time0 - temp.plannerStartTime;
      const updatePlannerFields = {
        $push: {
          timelineList: {
            startTime: { date: startTime.date, time: startTime.time },
            endTime: { date: endTime.date, time: endTime.time },
          },
        },
        $inc: { totalTime: todoTotal },
      };
      const planner = await this.updatePlanner(plannerId, updatePlannerFields);

      const newPlanner = await this.plannerModel.create({
        todo: planner.todo,
        date: today,
        userId: new Types.ObjectId(userId),
      });

      const updateStatisticFields = {
        $inc: { totalTime: todoTotal },
      };
      await this.updateStatistic(userId, temp.date, updateStatisticFields);

      await this.tempModel.updateOne(
        { userId: new Types.ObjectId(userId) },
        { date: today }
      );

      plannerId = newPlanner._id.toString();
      temp.plannerStartTime = time0;
    }

    const updatedTemp = await this.tempModel.updateOne(
      {
        userId: new Types.ObjectId(userId),
      },
      {
        plannerId: new Types.ObjectId(plannerId),
        restStartTime: currentTime,
        maxStartTime: 0,
      }
    );

    if (updatedTemp.modifiedCount !== 1) {
      throw new WsException('일시정지 에러');
    }

    const startTime = this.convertDateNumberToString(temp.plannerStartTime);
    const endTime = this.convertDateNumberToString(currentTime);
    const todoTotal = currentTime - temp.plannerStartTime;
    const updatePlannerFields = {
      $push: {
        timelineList: {
          startTime: { date: startTime.date, time: startTime.time },
          endTime: { date: endTime.date, time: endTime.time },
        },
      },
      $inc: { totalTime: todoTotal },
    };
    await this.updatePlanner(plannerId, updatePlannerFields);

    const maxTime = currentTime - temp.maxStartTime;
    const updateStatisticFields = {
      $inc: { totalTime: todoTotal },
      $max: { maxTime },
    };
    await this.updateStatistic(userId, today, updateStatisticFields);

    client.broadcast
      .to(roomId)
      .emit('updateUserState', { nickname, totalTime, state: 'stop' });
  }

  async change(client: Socket, payload: PayloadDto) {
    const { currentTime, totalTime } = payload;
    let plannerId = payload.plannerId;
    const { roomId, nickname } = this.getSocketQuery(client);
    const userId: string = client.data.user.sub;

    const today = this.getFormattedDate();

    const temp = await this.findTemp(userId);

    if (
      !temp ||
      !temp.maxStartTime ||
      temp.plannerId.toString() === plannerId
    ) {
      console.log('정지상태에서 할 일 변경 or 할 일 중복 선택');
      return;
    }

    await this.splitTimeIntoIntervals(
      userId,
      temp.plannerStartTime,
      currentTime
    );

    if (today !== temp.date) {
      const time0 = this.getStartOfDayTimestamp(currentTime);

      const startTime = this.convertDateNumberToString(temp.plannerStartTime);
      const endTime = this.convertDateNumberToString(time0);
      const todoTotal = time0 - temp.plannerStartTime;
      const updatePlannerFields = {
        $push: {
          timelineList: {
            startTime: { date: startTime.date, time: startTime.time },
            endTime: { date: endTime.date, time: endTime.time },
          },
        },
        $inc: { totalTime: todoTotal },
      };
      const planner = await this.updatePlanner(plannerId, updatePlannerFields);

      const newPlanner = await this.plannerModel.create({
        todo: planner.todo,
        date: today,
        userId: new Types.ObjectId(userId),
      });

      const updateStatisticFields = {
        $inc: { totalTime: todoTotal },
      };
      await this.updateStatistic(userId, temp.date, updateStatisticFields);

      await this.tempModel.updateOne(
        { userId: new Types.ObjectId(userId) },
        { date: today }
      );

      plannerId = newPlanner._id.toString();
      temp.plannerStartTime = time0;
    }

    const updatedTemp = await this.tempModel.updateOne(
      {
        userId: new Types.ObjectId(userId),
      },
      {
        plannerId: new Types.ObjectId(plannerId),
        plannerStartTime: currentTime,
      }
    );

    if (updatedTemp.modifiedCount !== 1) {
      throw new WsException('할 일 변경 에러');
    }

    const startTime = this.convertDateNumberToString(temp.plannerStartTime);
    const endTime = this.convertDateNumberToString(currentTime);
    const todoTotal = currentTime - temp.plannerStartTime;
    const updatePlannerFields = {
      $push: {
        timelineList: {
          startTime: { date: startTime.date, time: startTime.time },
          endTime: { date: endTime.date, time: endTime.time },
        },
      },
      $inc: { totalTime: todoTotal },
    };
    await this.updatePlanner(plannerId, updatePlannerFields);

    const updateStatisticFields = {
      $inc: { totalTime: todoTotal },
    };
    await this.updateStatistic(userId, today, updateStatisticFields);

    client.broadcast
      .to(roomId)
      .emit('updateUserState', { nickname, totalTime, state: 'change' });
  }

  async update(client: Socket, payload: PayloadDto) {
    const { currentTime } = payload;
    let plannerId = payload.plannerId;
    const userId: string = client.data.user.sub;

    const today = this.getFormattedDate();

    const temp = await this.findTemp(userId);

    if (!temp) {
      console.log('데이터 업데이트 에러');
      return;
    }

    await this.splitTimeIntoIntervals(
      userId,
      temp.plannerStartTime,
      currentTime
    );

    if (today !== temp.date) {
      const time0 = this.getStartOfDayTimestamp(currentTime);

      const todoTotal = time0 - temp.plannerStartTime;
      const updatePlannerFields = {
        $inc: { totalTime: todoTotal },
      };
      const planner = await this.updatePlanner(plannerId, updatePlannerFields);

      const newPlanner = await this.plannerModel.create({
        todo: planner.todo,
        date: today,
        userId: new Types.ObjectId(userId),
      });

      const updateStatisticFields = {
        $inc: { totalTime: todoTotal },
      };
      await this.updateStatistic(userId, temp.date, updateStatisticFields);

      await this.tempModel.updateOne(
        { userId: new Types.ObjectId(userId) },
        { date: today }
      );

      plannerId = newPlanner._id.toString();
      temp.plannerStartTime = time0;
    }

    const updatedTemp = await this.tempModel.updateOne(
      {
        userId: new Types.ObjectId(userId),
      },
      {
        plannerId: new Types.ObjectId(plannerId),
        plannerStartTime: currentTime,
      }
    );

    if (updatedTemp.modifiedCount !== 1) {
      throw new WsException('할 일 변경 에러');
    }

    const todoTotal = currentTime - temp.plannerStartTime;
    const updatePlannerFields = {
      $inc: { totalTime: todoTotal },
    };
    await this.updatePlanner(plannerId, updatePlannerFields);

    const updateStatisticFields = {
      $inc: { totalTime: todoTotal },
    };
    await this.updateStatistic(userId, today, updateStatisticFields);

    client.emit('responseUpdateData', { sucess: true });
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

  convertDateNumberToString(dateNum: number): convertDateNumberToStringDto {
    const dateTypeDate = new Date(dateNum);
    const date = dateTypeDate.toLocaleString('en-CA', { hour12: false });
    const array = date.split(', ');
    return { date: array[0], time: array[1] };
  }

  getStartOfDayTimestamp(currentTime: number): number {
    const date = new Date(currentTime);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  async findTemp(userId: string): Promise<Temp> {
    return await this.tempModel.findOne({ userId: new Types.ObjectId(userId) });
  }

  async updateStatistic(
    userId: string,
    date: string,
    updateFields: Record<string, any>
  ): Promise<UpdateWriteOpResult> {
    const statistic = await this.statisticModel.updateOne(
      {
        userId: new Types.ObjectId(userId),
        date: date,
      },
      updateFields,
      { upsert: true }
    );

    if (!(statistic.modifiedCount === 1 || statistic.upsertedCount === 1)) {
      throw new WsException('통계 업데이트 에러');
    }

    return statistic;
  }

  async updatePlanner(
    plannerId: Types.ObjectId | string,
    updateFields: Record<string, any>
  ): Promise<Planner> {
    let _id: Types.ObjectId;
    if (typeof plannerId === 'string') {
      _id = new Types.ObjectId(plannerId);
    } else {
      _id = plannerId;
    }
    const planner = await this.plannerModel.findOneAndUpdate(
      {
        _id,
      },
      updateFields,
      { new: true }
    );

    if (!planner) {
      throw new WsException('플래너 업데이트 에러');
    }

    return planner;
  }

  async splitTimeIntoIntervals(
    userId: string,
    startTime: number,
    endTime: number
  ): Promise<void> {
    const intervals = [];

    const fixedPoints = [0, 6, 12, 18];

    const currentStart = new Date(startTime);
    currentStart.setHours(0, 0, 0, 0);

    while (startTime < endTime) {
      const currentDateStr = currentStart.toLocaleDateString('en-CA');
      let night = 0,
        morning = 0,
        afternoon = 0,
        evening = 0;

      for (let i = 0; i < fixedPoints.length; i++) {
        const intervalStart = new Date(currentStart);
        intervalStart.setHours(fixedPoints[i], 0, 0, 0);

        let intervalEnd = new Date(intervalStart);
        intervalEnd.setHours(fixedPoints[i] + 6, 0, 0, 0);

        if (intervalEnd.getTime() > endTime) {
          intervalEnd = new Date(endTime);
        }

        if (
          intervalStart.getTime() < endTime &&
          intervalEnd.getTime() > startTime
        ) {
          const actualStart = Math.max(intervalStart.getTime(), startTime);
          const actualEnd = Math.min(intervalEnd.getTime(), endTime);
          const milliseconds = actualEnd - actualStart;

          if (i === 0) night += milliseconds;
          else if (i === 1) morning += milliseconds;
          else if (i === 2) afternoon += milliseconds;
          else if (i === 3) evening += milliseconds;
        }
      }

      intervals.push({
        date: currentDateStr,
        night: night,
        morning: morning,
        afternoon: afternoon,
        evening: evening,
      });

      currentStart.setDate(currentStart.getDate() + 1);
      startTime = currentStart.getTime();
    }

    intervals.forEach(async (value) => {
      const { date, ...etc } = value;
      const updateStatisticFields = {
        $inc: etc,
      };
      await this.updateStatistic(userId, date, updateStatisticFields);
    });
  }
}
