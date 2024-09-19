export class PlannerDto {
  subject?: string | undefined;

  todo: string;

  repeat: string | undefined;

  isComplete: boolean;

  date: string;

  startTime: string | undefined;

  endTime: string | undefined;

  userId: string;

  timelines: {
    startTime: string;
    endTime: string;
  }[];
}
