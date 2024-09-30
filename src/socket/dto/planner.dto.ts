import { Types } from 'mongoose';

export class SPlannerDto {
  _id: Types.ObjectId;
  todo: string;
  isComplete: boolean;
  date: string;
  totalTime: number;
}

export class getPlannerDto {
  date: string;
}

export class CreatePlannerDto {
  date: string;
  todo: string;
}

export class ModifyPlanner {
  plannerId: string;
  todo: string;
  isComplete: boolean;
}
