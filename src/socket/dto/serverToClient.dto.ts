import { PlannerDto } from './clientToServer.dto';

export class RoomInfoDto {
  title: string;
  notice: string;
  password: string;
  isChat: boolean;
  roomManager: string;
  currentMember: string[];
  planner: PlannerDto[];
}
