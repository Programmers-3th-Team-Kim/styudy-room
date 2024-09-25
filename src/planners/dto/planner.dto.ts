import { Types } from 'mongoose';

export class StartEndTime {
  startTime: string;
  EndTime: string;
}

export class PlannerDto {
  subject: string | undefined;

  todo: string;

  date: string;

  startTime: string | undefined;

  endTime: string | undefined;

  repeatDays: string[] | undefined;

  repeatWeeks: number | undefined;

  parentObjectId?: Types.ObjectId | undefined;

  isComplete: boolean;

  timelineList: StartEndTime[] | [];
}
