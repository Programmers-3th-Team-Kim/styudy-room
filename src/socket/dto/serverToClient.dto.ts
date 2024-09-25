import { SPlannerDto, SStatisticDto } from './clientToServer.dto';

export class AllInfoDto {
  title: string;
  notice: string;
  password: string;
  isChat: boolean;
  roomManager: string;
  currentMember: string[];
  planner: SPlannerDto[];
  statistic: SStatisticDto;
}

export class SocketQueryDto {
  roomId: string;
  nickname: string;
  imageUrl: string;
}
