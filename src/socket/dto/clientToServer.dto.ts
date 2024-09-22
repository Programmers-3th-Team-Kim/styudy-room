import { Types } from 'mongoose';
import { StartEndTime } from 'src/planners/planners.schema';

export class JoinRoomDto {
  roomId: string;
  nickname: string;
}

export class UserStateDto {
  nickname: string;
  timer: number;
  state: StartStopState;
}

export type StartStopState = 'start' | 'stop';

export class ResponseUserInfoDTO extends UserStateDto {
  socketId: string;
  roomId: string;
}

export class StatisticDto {
  userId: Types.ObjectId;
  date: string;
  total: number;
  max: number;
  break: number;
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
}

export class PlannerDto {
  _id: Types.ObjectId;
  todo: string;
  isComplete: boolean;
  date: string;
  timeLineList: StartEndTime[];
}

export class LeaveRoomDto {
  statistic: StatisticDto;
  planner: PlannerDto[];
  roomId: string;
  nickname: string;
  isChat: boolean;
}

export class SendChatDto {
  nickname: string;
  message: string;
  roomId: string;
}

export class StartTimerDto extends UserStateDto {
  restTime: number;
}

export class StopTimerDto extends UserStateDto {
  totalTime: number;
  maxTime: number;
  planner: PlannerDto[];
}

export class UpdateDto {
  totalTime: number;
  maxTime: number;
  restTime: number;
  planner: PlannerDto[];
}
