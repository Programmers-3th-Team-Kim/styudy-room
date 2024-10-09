import { SPlannerDto } from './planner.dto';

export class ResponseUserInfoDTO {
  timer: number;
  state: 'start' | 'stop';
  socketId: string;
}

export class SStatisticDto {
  date: string;
  total: number;
  max: number;
  rest: number;
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
}

export class LeaveRoomDto {
  statistic: SStatisticDto;
  planner: SPlannerDto[];
  isChat: boolean;
}

export class SendChatDto {
  message: string;
}

export class StartTimerDto {
  plannerId: string;
  dateTime: string;
  state: string;
}

export class StopTimerDto {
  timer: number;
  state: string;
  total: number;
  max: number;
  planner: SPlannerDto[];
}

export class UpdateDto {
  statistic: SStatisticDto;
  planner: SPlannerDto[];
}
