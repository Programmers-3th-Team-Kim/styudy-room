import { SPlannerDto } from './planner.dto';

export class RoomAndMyInfoDto {
  title: string;
  notice: string;
  password: string;
  isChat: boolean;
  roomManager: string;
  currentMember: string[];
  planner: SPlannerDto[];
  totalTime: number;
}

export class ResponseUserInfoDto {
  totalTime: number;
  state: 'start' | 'stop';
  socketId: string;
}

export class NoticeDto {
  message: string;
  time: string;
}
