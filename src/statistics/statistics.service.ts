import { BadRequestException, Injectable } from '@nestjs/common';
import { Statistic } from './statistics.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CalendarDto, ResponseCalendarDto } from './dto/calendar.dto';
import { DailyDto, ResponseDailyDto } from './dto/daily.dto';
import { PlannersService } from 'src/planners/planners.service';
import { TimePercentage, WeeklyMonthlyDto } from './dto/weeklyMonthly.dto';
import { AllGraph, AllLastAverage, DateTotalTime } from './dto/all.dto';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectModel(Statistic.name) private statisticModel: Model<Statistic>,
    private readonly plannersService: PlannersService
  ) {}

  async getCalendar(
    query: CalendarDto,
    userId: string
  ): Promise<ResponseCalendarDto[]> {
    let { year, month } = query;

    if (!year && !month) {
      const [sYear, sMonth] = this.getYYMMDDtoString();
      year = sYear;
      month = sMonth;
    }

    month = month.padStart(2, '0');

    const statistic = await this.findByDateRange(
      userId,
      `${year}-${month}-01`,
      `${year}-${month}-32`,
      {
        _id: false,
        date: true,
        totalTime: true,
      }
    );

    const [thisYear, thisMonth] = this.getYYMMDDtoString();
    const maxDate =
      year === thisYear && month === thisMonth
        ? Number(this.getYYMMDDtoString()[2])
        : new Date(Number(year), Number(month), 0).getDate();

    const allDates = Array.from({ length: maxDate }, (_, i) => i + 1);

    const existingDates = statistic.map((stat) =>
      Number(this.getYYMMDDtoString(stat.date)[2])
    );

    const missingDates = allDates
      .filter((date) => !existingDates.includes(date))
      .map((date) => ({
        date: `${year}-${month}-${date.toString().padStart(2, '0')}`,
        totalTime: 0,
      }));

    const completeStatistics: ResponseCalendarDto[] = [
      ...statistic,
      ...missingDates,
    ]
      .sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      })
      .map((item) => {
        return {
          date: item.date,
          totalTime: Math.round(item.totalTime / 60),
        };
      });

    return completeStatistics;
  }

  async getDailyStatistic(
    query: DailyDto,
    userId: string
  ): Promise<ResponseDailyDto> {
    let { year, month, day } = query;

    if (!year && !month && !day) {
      const [sYear, sMonth, sDay] = this.getYYMMDDtoString();
      year = sYear;
      month = sMonth;
      day = sDay;
    }

    month = month.padStart(2, '0');
    day = day.padStart(2, '0');

    const date = `${year}-${month}-${day}`;

    const statistic = await this.findDaily(userId, date, {
      totalTime: true,
      maxTime: true,
      restTime: true,
      _id: false,
    });

    if (!statistic) {
      return {
        totalTime: '00:00:00',
        maxTime: '00:00',
        restTime: '00:00',
        planner: [],
      };
    }

    const planner = await this.plannersService.find(userId, date, {
      todo: true,
      totalTime: true,
      _id: false,
    });

    const convertedPlanner = planner.map((item) => {
      return {
        ...item,
        totalTime: item.totalTime
          ? this.secondsToHHMMSS(item.totalTime, false)
          : '00:00',
        percentage: item.totalTime
          ? this.toPercentage(item.totalTime, statistic.totalTime)
          : 0,
      };
    });

    const convertedStatistic = {
      totalTime: this.secondsToHHMMSS(statistic.totalTime, true),
      maxTime: this.secondsToHHMMSS(statistic.maxTime, false),
      restTime: this.secondsToHHMMSS(statistic.restTime, false),
    };

    const results = {
      ...convertedStatistic,
      planner: convertedPlanner,
    };

    return results;
  }

  async getWeeklyStatistic(
    offset: string,
    userId: string
  ): Promise<WeeklyMonthlyDto> {
    const { startDate, endDate } = this.getWeekStartEndDates(offset);

    const statistic = await this.findByDateRange(userId, startDate, endDate, {
      _id: false,
      maxTime: false,
      userId: false,
      __v: false,
      date: false,
    });

    const convertedStatistic = this.calculateStatistics(statistic);

    const results = this.formatStatistics(convertedStatistic);

    return results;
  }

  async getMonthlyStatistic(
    offset: string,
    userId: string
  ): Promise<WeeklyMonthlyDto> {
    const currentDate = new Date();

    currentDate.setMonth(currentDate.getMonth() - Number(offset));

    const year = currentDate.getFullYear().toString();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');

    const statistic = await this.findByDateRange(
      userId,
      `${year}-${month}-01`,
      `${year}-${month}-32`,

      {
        _id: false,
        maxTime: false,
        userId: false,
        __v: false,
        date: false,
      }
    );

    const convertedStatistic = this.calculateStatistics(statistic);

    const results = this.formatStatistics(convertedStatistic);

    return results;
  }

  async getAllLastAverage(userId: string): Promise<AllLastAverage> {
    const currentDate = new Date();

    // 지난 월간 평균
    const lastMonthMaxDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      0
    ).getDate();

    const lastMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1
    ).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit' });

    const lastMonthStatistic = await this.findByDateRange(
      undefined,
      `${lastMonth}-01`,
      `${lastMonth}-32`,
      {
        totalTime: true,
        userId: true,
        date: true,
        _id: false,
      }
    );

    let allLastMonthTotalSum: number = 0;

    for (let i = 1; i <= lastMonthMaxDate; i++) {
      const data = lastMonthStatistic.filter(
        (item) =>
          item.date ===
          new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            i
          ).toLocaleDateString('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })
      );

      allLastMonthTotalSum += data.length
        ? data.reduce((acc, item) => acc + item.totalTime, 0) / data.length
        : 0;
    }

    const allLastMonthTotal = this.secondsToHHMMSS(
      allLastMonthTotalSum / lastMonthMaxDate,
      false
    );

    const myLastMonthTotalSum = lastMonthStatistic
      .filter((item) => item.userId.toString() === userId)
      .reduce((acc, item) => acc + item.totalTime, 0);

    const myLastMonthTotal = this.secondsToHHMMSS(
      myLastMonthTotalSum / lastMonthMaxDate,
      false
    );

    // 지난 주간 평균
    const { startDate, endDate } = this.getWeekStartEndDates('1');

    const lastWeekStatistic = await this.findByDateRange(
      undefined,
      startDate,
      endDate,
      {
        totalTime: true,
        userId: true,
        date: true,
        _id: false,
      }
    );

    let allLastWeekTotalSum: number = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      const data = lastWeekStatistic.filter(
        (item) =>
          item.date ===
          new Date(date.setDate(date.getDate() + i)).toLocaleDateString('en-CA')
      );

      allLastWeekTotalSum += data.length
        ? data.reduce((acc, item) => acc + item.totalTime, 0) / data.length
        : 0;
    }

    const myLastWeekTotalSum = lastWeekStatistic
      .filter((item) => item.userId.toString() === userId)
      .reduce((acc, item) => acc + item.totalTime, 0);

    const allLastWeekTotal = this.secondsToHHMMSS(
      allLastWeekTotalSum / 7,
      false
    );

    const myLastWeekTotal = this.secondsToHHMMSS(myLastWeekTotalSum / 7, false);

    // 어제 평균
    const today = currentDate.toLocaleDateString('en-CA');
    const yesterday = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() - 1
    ).toLocaleDateString('en-CA');

    const yesterdayStatistic = await this.findByDateRange(
      undefined,
      yesterday,
      today,
      {
        totalTime: true,
        userId: true,
        date: true,
        _id: false,
      }
    );

    const allYesterdayTotalSum = yesterdayStatistic.reduce(
      (acc, item) => acc + item.totalTime,
      0
    );

    const myYesterdayTotalSum = yesterdayStatistic.filter(
      (item) => item.userId.toString() === userId
    )[0].totalTime;

    const allYesterdayTotal = this.secondsToHHMMSS(
      allYesterdayTotalSum / yesterdayStatistic.length,
      false
    );

    const myYesterdayTotal = this.secondsToHHMMSS(myYesterdayTotalSum, false);

    const allYesterday = allYesterdayTotal.split(':');
    const allLastWeek = allLastWeekTotal.split(':');
    const allLastMonth = allLastMonthTotal.split(':');
    const myYesterday = myYesterdayTotal.split(':');
    const myLastWeek = myLastWeekTotal.split(':');
    const myLastMonth = myLastMonthTotal.split(':');

    const results = {
      all: {
        yesterday: { hours: allYesterday[0], minutes: allYesterday[1] },
        lastWeek: { hours: allLastWeek[0], minutes: allLastWeek[1] },
        lastMonth: { hours: allLastMonth[0], minutes: allLastMonth[1] },
      },
      my: {
        yesterday: { hours: myYesterday[0], minutes: myYesterday[1] },
        lastWeek: { hours: myLastWeek[0], minutes: myLastWeek[1] },
        lastMonth: { hours: myLastMonth[0], minutes: myLastMonth[1] },
      },
    };

    return results;
  }

  async getAllGraph(offset: string, userId: string): Promise<AllGraph> {
    const currentDate = new Date();
    const endDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() + 1 - Number(offset)
    ).toLocaleDateString('en-CA');

    const startDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() - 6 - Number(offset)
    ).toLocaleDateString('en-CA');

    const statistic = await this.findByDateRange(
      undefined,
      startDate,
      endDate,
      {
        totalTime: true,
        userId: true,
        date: true,
        _id: false,
      }
    );

    const allAverageList: DateTotalTime[] = [];
    const myAverageList: DateTotalTime[] = [];
    let allAverageSum: number = 0;
    let myAverageSum: number = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      const dateString = new Date(
        date.setDate(date.getDate() + i)
      ).toLocaleDateString('en-CA');

      const data = statistic.filter((item) => item.date === dateString);

      const myData = data.filter((item) => item.userId.toString() === userId);

      const allDailyAverage = data.length
        ? data.reduce((acc, item) => acc + item.totalTime, 0) / data.length
        : 0;

      const myDailyAverage = myData.length ? myData[0].totalTime : 0;

      allAverageSum += allDailyAverage;
      myAverageSum += myDailyAverage;

      allAverageList.push({
        date: dateString,
        totalTime: Math.round(allDailyAverage / 60),
      });

      myAverageList.push({
        date: dateString,
        totalTime: Math.round(myDailyAverage / 60),
      });
    }

    const results = {
      all: {
        totalAverage: Math.round(allAverageSum / 60),
        dailyAverage: allAverageList,
      },
      my: {
        totalAverage: Math.round(myAverageSum / 60),
        dailyAverage: myAverageList,
      },
    };

    return results;
  }

  async findByDateRange(
    userId: string,
    startDate: string,
    endDate: string,
    projectionFields?: Record<string, boolean>
  ): Promise<Statistic[]> {
    const query: any = {
      date: {
        $gte: startDate,
        $lt: endDate,
      },
    };

    if (userId) {
      query.userId = new Types.ObjectId(userId);
    }

    return await this.statisticModel.find(query, projectionFields).lean();
  }

  async findDaily(
    userId: string,
    date: string,
    projectionFields?: Record<string, boolean>
  ): Promise<Statistic> {
    return await this.statisticModel
      .findOne(
        {
          userId: new Types.ObjectId(userId),
          date,
        },
        projectionFields
      )
      .lean();
  }

  secondsToHHMMSS(second: number, option: boolean): string {
    const hours = Math.floor(second / 3600);
    const minutes = Math.floor((second % 3600) / 60);
    const seconds = second % 60;

    if (option) {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}`;
    }
  }

  getYYMMDDtoString(date?: string): string[] {
    return date
      ? date.split('-')
      : new Date().toLocaleDateString('en-CA').split('-');
  }

  getWeekStartEndDates(weekOffset: string): {
    startDate: string;
    endDate: string;
  } {
    const offset = parseInt(weekOffset, 10) || 0;

    if (isNaN(offset) || offset < 0) {
      throw new BadRequestException(
        '미래 날짜에 대한 통계는 조회할 수 없습니다.'
      );
    }

    const currentDate = new Date();

    const dayOfWeek = currentDate.getDay();

    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(
      currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    );

    startOfWeek.setDate(startOfWeek.getDate() - offset * 7);

    const endOfWeek = offset === 0 ? new Date() : new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return {
      startDate: startOfWeek.toLocaleDateString('en-CA'),
      endDate: endOfWeek.toLocaleDateString('en-CA'),
    };
  }

  toPercentage(part: number, total: number): number {
    return Math.round((part / total) * 1000) / 10;
  }

  calculateStatistics(statistic): WeeklyMonthlyDto {
    return statistic.reduce(
      (acc, item) => {
        acc.afternoon += item.afternoon;
        acc.evening += item.evening;
        acc.morning += item.morning;
        acc.night += item.night;
        acc.restTime += item.restTime;
        acc.totalTime += item.totalTime;
        return acc;
      },
      {
        afternoon: 0,
        evening: 0,
        morning: 0,
        night: 0,
        restTime: 0,
        totalTime: 0,
      }
    );
  }

  formatStatistics(convertedStatistic): WeeklyMonthlyDto {
    const { totalTime, restTime } = convertedStatistic;

    return {
      totalTime: this.secondsToHHMMSS(totalTime, true),
      restTime: this.secondsToHHMMSS(restTime, true),
      morning: this.getTimeAndPercentage(convertedStatistic.morning, totalTime),
      afternoon: this.getTimeAndPercentage(
        convertedStatistic.afternoon,
        totalTime
      ),
      evening: this.getTimeAndPercentage(convertedStatistic.evening, totalTime),
      night: this.getTimeAndPercentage(convertedStatistic.night, totalTime),
    };
  }

  getTimeAndPercentage(
    timeInSeconds: number,
    totalTime: number
  ): TimePercentage {
    return {
      time: this.secondsToHHMMSS(timeInSeconds, true),
      percentage: this.toPercentage(timeInSeconds, totalTime),
    };
  }
}
