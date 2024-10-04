import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { WsException } from '@nestjs/websockets';
import {
  FilterQuery,
  Model,
  Types,
  UpdateQuery,
  UpdateWriteOpResult,
} from 'mongoose';
import { Server, Socket } from 'socket.io';
import { Planner } from 'src/planners/planners.schema';
import { Room } from 'src/rooms/rooms.schema';
import { Statistic } from 'src/statistics/statistics.schema';
import { User } from 'src/users/users.schema';
import { PayloadDto } from './dto/chatAndInteraction.dto';
import {
  CreatePlannerDto,
  ModifyPlannerDto,
  SPlannerDto,
} from './dto/planner.dto';
import { Temp } from './temps.schema';
import { NoticeDto, RoomAndMyInfoDto } from './dto/joinAndLeave.dto';
import {
  RoomManagerAndMembersToNicknameDto,
  SocketQueryDto,
  SplitTimeIntoIntervalsDto,
} from './dto/util.dto';

@Injectable()
export class SocketService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(Planner.name) private plannerModel: Model<Planner>,
    @InjectModel(Statistic.name) private statisticModel: Model<Statistic>,
    @InjectModel(Temp.name) private tempModel: Model<Temp>
  ) {}

  joinChat(server: Server, roomId: string, nickname: string): void {
    const notice: NoticeDto = {
      message: `${nickname}님께서 입장하셨습니다.`,
      time: this.getFormattedTime(),
    };
    server.to(roomId).emit('notice', notice);
  }

  leaveChat(server: Server, roomId: string, nickname: string): void {
    const notice: NoticeDto = {
      message: `${nickname}님께서 퇴장하셨습니다.`,
      time: this.getFormattedTime(),
    };
    server.to(roomId).emit('notice', notice);
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

  async getRoomAndMyInfo(
    client: Socket,
    room: Room
  ): Promise<RoomAndMyInfoDto> {
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

    const allInfo: RoomAndMyInfoDto = {
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

    const temp = await this.findTemp(userId);

    await this.tempModel.deleteMany({ userId: new Types.ObjectId(userId) });

    if (!temp || !temp.maxStartTime) {
      console.log('입장 후 바로 종료 or 정지 후 종료');
      return;
    }

    const results = this.splitTimeIntoIntervals(
      temp.plannerStartTime,
      currentTime
    );

    const planner = await this.plannerModel.findById(temp.plannerId);

    const today = this.getFormattedDate();

    results.forEach(async (v) => {
      const { date, totalTime, timelineList, ...etc } = v;
      const filter =
        planner.date === date
          ? { _id: temp.plannerId }
          : { todo: planner.todo, date, userId: new Types.ObjectId(userId) };
      const maxTime = date === today ? currentTime - temp.maxStartTime : 0;

      await this.updatePlanner(filter, {
        $push: { timelineList },
        $inc: { totalTime },
      });

      await this.updateStatistic(userId, date, {
        $max: { maxTime },
        $inc: { totalTime, ...etc },
      });
    });
  }

  async leaveRoom(client: Socket, roomId: string): Promise<Room> {
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
    const { plannerId, currentTime, totalTime } = payload;
    const userId: string = client.data.user.sub;
    const { roomId, nickname } = this.getSocketQuery(client);

    const temp = await this.findTemp(userId);

    if (temp) {
      if (!temp.restStartTime) {
        console.log('시작 중복 실행');
        return;
      }

      const results = this.splitTimeIntoIntervals(
        temp.restStartTime,
        currentTime
      );

      results.forEach(async (v: any) => {
        const { date, totalTime } = v;
        await this.updateStatistic(userId, date, {
          $inc: { restTime: totalTime },
        });
      });
    }

    const today = this.getFormattedDate();

    await this.updateTemp(userId, today, {
      plannerId: new Types.ObjectId(plannerId),
      maxStartTime: currentTime,
      plannerStartTime: currentTime,
      restStartTime: 0,
    });

    client.broadcast
      .to(roomId)
      .emit('updateUserState', { nickname, totalTime, state: 'start' });
  }

  async stop(client: Socket, payload: PayloadDto) {
    const { currentTime, totalTime } = payload;
    const plannerId = payload.plannerId;
    const { roomId, nickname } = this.getSocketQuery(client);
    const userId: string = client.data.user.sub;

    const temp = await this.findTemp(userId);

    if (!temp || !temp.maxStartTime) {
      console.log('일시정지 중복 실행');
      return;
    }

    if (temp.plannerId.toString() !== plannerId) {
      throw new WsException('일시정지 에러');
    }

    const results = this.splitTimeIntoIntervals(
      temp.plannerStartTime,
      currentTime
    );

    const planner = await this.plannerModel.findById(plannerId);

    const today = this.getFormattedDate();

    results.forEach(async (v) => {
      const { date, totalTime, timelineList, ...etc } = v;
      const filter =
        planner.date === date
          ? { _id: new Types.ObjectId(plannerId) }
          : { todo: planner.todo, date, userId: new Types.ObjectId(userId) };
      const maxTime =
        date === today
          ? Math.floor((currentTime - temp.maxStartTime) / 1000)
          : 0;

      await this.updatePlanner(filter, {
        $push: { timelineList },
        $inc: { totalTime },
      });

      await this.updateStatistic(userId, date, {
        $max: { maxTime },
        $inc: { totalTime, ...etc },
      });
    });

    await this.updateTemp(userId, today, {
      plannerId: new Types.ObjectId(plannerId),
      restStartTime: currentTime,
      maxStartTime: 0,
    });

    client.broadcast
      .to(roomId)
      .emit('updateUserState', { nickname, totalTime, state: 'stop' });
  }

  async change(client: Socket, payload: PayloadDto) {
    const { plannerId, currentTime, totalTime } = payload;
    const { roomId, nickname } = this.getSocketQuery(client);
    const userId: string = client.data.user.sub;

    const temp = await this.findTemp(userId);

    if (
      !temp ||
      !temp.maxStartTime ||
      temp.plannerId.toString() === plannerId
    ) {
      console.log('정지상태에서 할 일 변경 or 할 일 중복 선택');
      return;
    }

    const results = this.splitTimeIntoIntervals(
      temp.plannerStartTime,
      currentTime
    );

    const planner = await this.plannerModel.findById(plannerId);
    const today = this.getFormattedDate();

    results.forEach(async (v) => {
      const { date, totalTime, timelineList, ...etc } = v;
      const filter =
        planner.date === date
          ? { _id: new Types.ObjectId(plannerId) }
          : { todo: planner.todo, date, userId: new Types.ObjectId(userId) };

      await this.updatePlanner(filter, {
        $push: { timelineList },
        $inc: { totalTime },
      });

      await this.updateStatistic(userId, date, {
        $inc: { totalTime, ...etc },
      });
    });

    await this.updateTemp(userId, today, {
      plannerId: new Types.ObjectId(plannerId),
      plannerStartTime: currentTime,
    });

    client.broadcast
      .to(roomId)
      .emit('updateUserState', { nickname, totalTime, state: 'change' });
  }

  async update(client: Socket, payload: PayloadDto) {
    const { plannerId, currentTime } = payload;
    const userId: string = client.data.user.sub;

    const temp = await this.findTemp(userId);

    if (!temp) {
      console.log('데이터 업데이트 에러');
      return;
    }

    const results = this.splitTimeIntoIntervals(
      temp.plannerStartTime,
      currentTime
    );

    const planner = await this.plannerModel.findById(plannerId);

    results.forEach(async (v) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { date, totalTime, timelineList, ...etc } = v;
      const filter =
        planner.date === date
          ? { _id: new Types.ObjectId(plannerId) }
          : { todo: planner.todo, date, userId: new Types.ObjectId(userId) };

      await this.updatePlanner(filter, {
        $inc: { totalTime },
      });

      await this.updateStatistic(userId, date, {
        $inc: { totalTime, ...etc },
      });
    });

    const today = this.getFormattedDate();

    await this.updateTemp(userId, today, {
      plannerId: new Types.ObjectId(plannerId),
      plannerStartTime: currentTime,
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

  async modifyPlanner(payload: ModifyPlannerDto): Promise<SPlannerDto> {
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

  getFormattedTime(): string {
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

  async getRoomManagerAndMembersToNickname(
    room: Room
  ): Promise<RoomManagerAndMembersToNicknameDto> {
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

  async findTemp(userId: string): Promise<Temp> {
    return await this.tempModel.findOne({ userId: new Types.ObjectId(userId) });
  }

  async updateStatistic(
    userId: string,
    date: string,
    updateFields: UpdateQuery<Statistic>
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
    filterFields: FilterQuery<Planner>,
    updateFields: UpdateQuery<Planner>
  ): Promise<Planner> {
    const planner = await this.plannerModel.findOneAndUpdate(
      filterFields,
      updateFields,
      {
        new: true,
        upsert: true,
      }
    );

    if (!planner) {
      throw new WsException('플래너 업데이트 에러');
    }

    return planner;
  }

  async updateTemp(
    userId: string,
    today: string,
    updateFields: UpdateQuery<Temp>
  ): Promise<void> {
    const updatedTemp = await this.tempModel.updateOne(
      {
        userId: new Types.ObjectId(userId),
      },
      {
        ...updateFields,
        date: today,
      },
      {
        upsert: true,
      }
    );

    if (!updatedTemp) {
      throw new WsException('데이터 업데이트 에러');
    }
  }

  splitTimeIntoIntervals(
    startTime: number,
    endTime: number
  ): SplitTimeIntoIntervalsDto[] {
    const intervals = [];

    const fixedPoints = [0, 5, 12, 17, 22];
    const endPoints = [5, 7, 5, 5, 2];

    const currentStart = new Date(startTime);
    currentStart.setHours(0, 0, 0, 0);

    const formatTime = (date: Date) => {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    while (startTime < endTime) {
      const currentDateStr = currentStart.toLocaleDateString('en-CA');
      let night = 0,
        morning = 0,
        afternoon = 0,
        evening = 0;

      const actualEndTime = new Date(
        Math.min(endTime, currentStart.getTime() + 24 * 60 * 60 * 1000 - 1)
      );

      for (let i = 0; i < fixedPoints.length; i++) {
        const intervalStart = new Date(currentStart);
        intervalStart.setHours(fixedPoints[i], 0, 0, 0);

        let intervalEnd = new Date(intervalStart);
        intervalEnd.setHours(fixedPoints[i] + endPoints[i], 0, 0, 0);

        if (intervalEnd.getTime() > endTime) {
          intervalEnd = new Date(endTime);
        }

        if (
          intervalStart.getTime() < endTime &&
          intervalEnd.getTime() > startTime
        ) {
          const actualStart = Math.max(intervalStart.getTime(), startTime);
          const actualEnd = Math.min(intervalEnd.getTime(), endTime);
          const milliseconds = Math.floor((actualEnd - actualStart) / 1000);

          if (i === 0) night += milliseconds;
          else if (i === 1) morning += milliseconds;
          else if (i === 2) afternoon += milliseconds;
          else if (i === 3) evening += milliseconds;
          else if (i === 4) night += milliseconds;
        }
      }

      intervals.push({
        date: currentDateStr,
        night: night,
        morning: morning,
        afternoon: afternoon,
        evening: evening,
        totalTime: night + morning + afternoon + evening,
        timelineList: {
          startTime: {
            date: new Date(startTime).toLocaleDateString('en-CA'),
            time: formatTime(new Date(startTime)),
          },
          endTime: {
            date: new Date(actualEndTime).toLocaleDateString('en-CA'),
            time: formatTime(actualEndTime),
          },
        },
      });

      currentStart.setDate(currentStart.getDate() + 1);
      startTime = currentStart.getTime();
    }

    return intervals;
  }
}
