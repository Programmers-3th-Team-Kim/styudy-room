export class WeeklyMonthlyDto {
  totalTime: string;
  restTime: string;
  morning: TimePercentage;
  afternoon: TimePercentage;
  evening: TimePercentage;
  night: TimePercentage;
}

export class TimePercentage {
  time: string;
  percentage: number;
}
