import { Types } from 'mongoose';

export class PlannerDto {
  subject: string | undefined;

  todo: string;

  date: string;

  startTime: string | undefined;

  endTime: string | undefined;

  repeatDays: string[];

  repeatWeeks: number;

  parentObjectId?: Types.ObjectId | undefined;

  isComplete: boolean;

  timelineList: {
    startTime: string;
    endTime: string;
  }[];

  userId: Types.ObjectId;
}
