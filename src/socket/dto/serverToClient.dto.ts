import { PlannerDto, StatisticDto } from './clientToServer.dto';

export class AllInfoDto {
  title: string;
  notice: string;
  password: string;
  isChat: boolean;
  roomManager: string;
  currentMember: string[];
  planner: PlannerDto[];
  statistic: StatisticDto;
}

export class SocketQueryDto {
  roomId: string;
  nickname: string;
  imageUrl: string;
}
