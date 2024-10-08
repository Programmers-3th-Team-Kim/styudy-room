import { IsString, Matches, IsOptional } from 'class-validator';

export class DailyDto {
  @IsOptional()
  @IsString({ message: '연도는 문자열이어야 합니다.' })
  @Matches(/^\d{4}$/, { message: '연도는 4자리 숫자여야 합니다.' })
  year: string;

  @IsOptional()
  @IsString({ message: '월은 문자열이어야 합니다.' })
  @Matches(/^(0[1-9]|1[0-2])|[1-9]$/, {
    message: '월은 01부터 12까지의 2자리 숫자여야 합니다.',
  })
  month: string;

  @IsOptional()
  @IsString({ message: '일은 문자열이어야 합니다.' })
  @Matches(/^(0[1-9]|[12][0-9]|3[01]|[1-9])$/, {
    message: '일은 01부터 31까지의 2자리 숫자여야 합니다.',
  })
  day: string;
}

export class ResponseDailyDto {
  totalTime: string;
  maxTime: string;
  restTime: string;
  planner: TodoStatistic[];
}

export class TodoStatistic {
  todo: string;
  totalTime: string;
  percentage: number;
}
