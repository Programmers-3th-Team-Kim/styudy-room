import { Types } from 'mongoose';

export class SPlannerDto {
  _id: Types.ObjectId;
  todo: string;
  isComplete: boolean;
  date: string;
  totalTime: number;
}

export class GetPlannerDto {
  date: string;
}

export class CreatePlannerDto {
  date: string;
  todo: string;
}

export class ModifyPlannerDto {
  plannerId: string;
  todo: string;
  isComplete: boolean;
}
