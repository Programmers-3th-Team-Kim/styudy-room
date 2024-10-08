export class AllLastAverage {
  all: LastDayToMonth;
  my: LastDayToMonth;
}

export class LastDayToMonth {
  yesterday: HoursMinutes;
  lastWeek: HoursMinutes;
  lastMonth: HoursMinutes;
}

export class HoursMinutes {
  hours: string;
  minutes: string;
}

export class AllGraph {
  all: Average;
  my: Average;
}

export class Average {
  totalAverage: number;
  dailyAverage: DateTotalTime[];
}

export class DateTotalTime {
  date: string;
  totalTime: number;
}
