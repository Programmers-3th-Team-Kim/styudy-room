import {
  IsOptional,
  IsString,
  Matches,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'YearAndMonthValidator', async: false })
class YearAndMonthValidator implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const obj = args.object as CalendarDto;
    const yearExists = !!obj.year;
    const monthExists = !!obj.month;

    return (yearExists && monthExists) || (!yearExists && !monthExists);
  }

  defaultMessage() {
    return '연도와 월은 모두 제공되거나 모두 생략되어야 합니다.';
  }
}

export class CalendarDto {
  @IsOptional()
  @IsString({ message: '연도는 문자열이어야 합니다.' })
  @Matches(/^\d{4}$/, { message: '연도는 4자리 숫자여야 합니다.' })
  @Validate(YearAndMonthValidator)
  year: string;

  @IsOptional()
  @IsString({ message: '월은 문자열이어야 합니다.' })
  @Matches(/^(0[1-9]|1[0-2]|[1-9])$/, {
    message: '월은 1부터 12까지의 숫자여야 합니다.',
  })
  @Validate(YearAndMonthValidator)
  month: string;
}

export class ResponseCalendarDto {
  totalTime: number;
  date: string;
}
