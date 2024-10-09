import { Injectable } from '@nestjs/common';
import { StatisticsService } from 'src/statistics/statistics.service';
import { DailyRankingDto } from './dto/rankings.dto';
import { Types } from 'mongoose';
import { UsersService } from './../users/users.service';

@Injectable()
export class RankingsService {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly usersService: UsersService
  ) {}

  async getRankingsJwt(userId: string) {
    const { dayList, ...etc } = await this.dailyRankingJwt(userId);
    const { weekList } = await this.weeklyRankingJwt(userId);
    const { monthList } = await this.monthlyRankingJwt(userId);

    return {
      dayList,
      weekList,
      monthList,
      ...etc,
    };
  }

  async getRankings() {
    const { dayList } = await this.dailyRanking();
    const { weekList } = await this.weeklyRanking();
    const { monthList } = await this.monthlyRanking();

    return {
      dayList,
      weekList,
      monthList,
    };
  }

  async dailyRankingJwt(userId: string) {
    const currentDate = new Date();
    const today = currentDate.toLocaleDateString('en-CA');
    const tomorrow = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() + 1
    ).toLocaleDateString('en-CA');

    const statistic = await this.statisticsService.findByDateRange(
      undefined,
      today,
      tomorrow,
      {
        _id: false,
        userId: true,
        totalTime: true,
      }
    );

    let rank = 1;
    let userInfo: any;

    const sortedStatistic = statistic.sort((a, b) => b.totalTime - a.totalTime);

    const updatedStatistic = [];
    for (const item of sortedStatistic) {
      const user = await this.usersService.findById(item.userId);

      if (item.userId.toString() === userId) {
        userInfo = {
          nickname: user.nickname,
          totalTime: this.statisticsService.secondsToHHMMSS(
            item.totalTime,
            true
          ),
          rank: rank,
        };
      }

      updatedStatistic.push({
        nickname: user ? user.nickname : 'unknown',
        totalTime: this.statisticsService.secondsToHHMMSS(item.totalTime, true),
        rank: rank++,
      });
    }

    if (!userInfo) {
      const user = await this.usersService.findById(new Types.ObjectId(userId));
      userInfo = {
        nickname: user.nickname,
        totalTime: '00:00:00',
        rank: updatedStatistic.length + 1,
      };
    }

    const top10 = updatedStatistic.filter((item) => item.rank <= 10);

    const prevUserInfo = updatedStatistic.filter(
      (item) => item.rank === userInfo.rank - 1
    );
    const nextUserInfo = updatedStatistic.filter(
      (item) => item.rank === userInfo.rank + 1
    );

    return {
      dayList: {
        top10,
        userInfo,
      },
      userInfo,
      prevUserInfo: prevUserInfo.length ? prevUserInfo[0] : {},
      nextUserInfo: nextUserInfo.length ? nextUserInfo[0] : {},
    };
  }

  async weeklyRankingJwt(userId: string) {
    const { startDate, endDate } =
      this.statisticsService.getWeekStartEndDates('0');

    const statistic = await this.statisticsService.findByDateRange(
      undefined,
      startDate,
      endDate,
      {
        _id: false,
        userId: true,
        totalTime: true,
      }
    );

    const aggregatedStatistic = statistic.reduce((acc, current) => {
      const userIdStr = current.userId.toString();

      if (acc[userIdStr]) {
        acc[userIdStr].totalTime += current.totalTime;
      } else {
        acc[userIdStr] = {
          userId: current.userId,
          totalTime: current.totalTime,
        };
      }

      return acc;
    }, {});

    const totalStatistic: DailyRankingDto[] =
      Object.values(aggregatedStatistic);

    let rank = 1;
    let userInfo: any;

    const sortedStatistic = totalStatistic.sort(
      (a, b) => b.totalTime - a.totalTime
    );

    const updatedStatistic = [];
    for (const item of sortedStatistic) {
      const user = await this.usersService.findById(item.userId);

      if (item.userId.toString() === userId) {
        userInfo = {
          nickname: user.nickname,
          totalTime: this.statisticsService.secondsToHHMMSS(
            item.totalTime,
            true
          ),
          rank: rank,
        };
      }

      updatedStatistic.push({
        nickname: user ? user.nickname : 'unknown',
        totalTime: this.statisticsService.secondsToHHMMSS(item.totalTime, true),
        rank: rank++,
      });
    }

    if (!userInfo) {
      const user = await this.usersService.findById(new Types.ObjectId(userId));
      userInfo = {
        nickname: user.nickname,
        totalTime: '00:00:00',
        rank: updatedStatistic.length + 1,
      };
    }

    const top10 = updatedStatistic.filter((item) => item.rank <= 10);

    return {
      weekList: {
        top10,
        userInfo,
      },
    };
  }

  async monthlyRankingJwt(userId: string) {
    const currentMonth = new Date().toLocaleDateString('en-CA', {
      year: 'numeric',
      month: '2-digit',
    });

    const statistic = await this.statisticsService.findByDateRange(
      undefined,
      `${currentMonth}-01`,
      `${currentMonth}-32`,
      {
        _id: false,
        userId: true,
        totalTime: true,
      }
    );

    const aggregatedStatistic = statistic.reduce((acc, current) => {
      const userIdStr = current.userId.toString();

      if (acc[userIdStr]) {
        acc[userIdStr].totalTime += current.totalTime;
      } else {
        acc[userIdStr] = {
          userId: current.userId,
          totalTime: current.totalTime,
        };
      }

      return acc;
    }, {});

    const totalStatistic: DailyRankingDto[] =
      Object.values(aggregatedStatistic);

    let rank = 1;
    let userInfo: any;

    const sortedStatistic = totalStatistic.sort(
      (a, b) => b.totalTime - a.totalTime
    );

    const updatedStatistic = [];
    for (const item of sortedStatistic) {
      const user = await this.usersService.findById(item.userId);

      if (item.userId.toString() === userId) {
        userInfo = {
          nickname: user.nickname,
          totalTime: this.statisticsService.secondsToHHMMSS(
            item.totalTime,
            true
          ),
          rank: rank,
        };
      }

      updatedStatistic.push({
        nickname: user ? user.nickname : 'unknown',
        totalTime: this.statisticsService.secondsToHHMMSS(item.totalTime, true),
        rank: rank++,
      });
    }

    if (!userInfo) {
      const user = await this.usersService.findById(new Types.ObjectId(userId));
      userInfo = {
        nickname: user.nickname,
        totalTime: '00:00:00',
        rank: updatedStatistic.length + 1,
      };
    }

    const top10 = updatedStatistic.filter((item) => item.rank <= 10);

    return {
      monthList: {
        top10,
        userInfo,
      },
    };
  }

  async dailyRanking() {
    const currentDate = new Date();
    const today = currentDate.toLocaleDateString('en-CA');
    const tomorrow = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() + 1
    ).toLocaleDateString('en-CA');

    const statistic = await this.statisticsService.findByDateRange(
      undefined,
      today,
      tomorrow,
      {
        _id: false,
        userId: true,
        totalTime: true,
      }
    );

    let rank = 1;

    const sortedStatistic = statistic.sort((a, b) => b.totalTime - a.totalTime);

    const updatedStatistic = [];
    for (const item of sortedStatistic) {
      const user = await this.usersService.findById(item.userId);

      updatedStatistic.push({
        nickname: user ? user.nickname : 'unknown',
        totalTime: this.statisticsService.secondsToHHMMSS(item.totalTime, true),
        rank: rank++,
      });
    }

    const top10 = updatedStatistic.filter((item) => item.rank <= 10);

    return {
      dayList: {
        top10,
      },
    };
  }

  async weeklyRanking() {
    const { startDate, endDate } =
      this.statisticsService.getWeekStartEndDates('0');

    const statistic = await this.statisticsService.findByDateRange(
      undefined,
      startDate,
      endDate,
      {
        _id: false,
        userId: true,
        totalTime: true,
      }
    );

    const aggregatedStatistic = statistic.reduce((acc, current) => {
      const userIdStr = current.userId.toString();

      if (acc[userIdStr]) {
        acc[userIdStr].totalTime += current.totalTime;
      } else {
        acc[userIdStr] = {
          userId: current.userId,
          totalTime: current.totalTime,
        };
      }

      return acc;
    }, {});

    const totalStatistic: DailyRankingDto[] =
      Object.values(aggregatedStatistic);

    let rank = 1;

    const sortedStatistic = totalStatistic.sort(
      (a, b) => b.totalTime - a.totalTime
    );

    const updatedStatistic = [];
    for (const item of sortedStatistic) {
      const user = await this.usersService.findById(item.userId);

      updatedStatistic.push({
        nickname: user ? user.nickname : 'unknown',
        totalTime: this.statisticsService.secondsToHHMMSS(item.totalTime, true),
        rank: rank++,
      });
    }

    const top10 = updatedStatistic.filter((item) => item.rank <= 10);

    return {
      weekList: {
        top10,
      },
    };
  }

  async monthlyRanking() {
    const currentMonth = new Date().toLocaleDateString('en-CA', {
      year: 'numeric',
      month: '2-digit',
    });

    const statistic = await this.statisticsService.findByDateRange(
      undefined,
      `${currentMonth}-01`,
      `${currentMonth}-32`,
      {
        _id: false,
        userId: true,
        totalTime: true,
      }
    );

    const aggregatedStatistic = statistic.reduce((acc, current) => {
      const userIdStr = current.userId.toString();

      if (acc[userIdStr]) {
        acc[userIdStr].totalTime += current.totalTime;
      } else {
        acc[userIdStr] = {
          userId: current.userId,
          totalTime: current.totalTime,
        };
      }

      return acc;
    }, {});

    const totalStatistic: DailyRankingDto[] =
      Object.values(aggregatedStatistic);

    let rank = 1;

    const sortedStatistic = totalStatistic.sort(
      (a, b) => b.totalTime - a.totalTime
    );

    const updatedStatistic = [];
    for (const item of sortedStatistic) {
      const user = await this.usersService.findById(item.userId);

      updatedStatistic.push({
        nickname: user ? user.nickname : 'unknown',
        totalTime: this.statisticsService.secondsToHHMMSS(item.totalTime, true),
        rank: rank++,
      });
    }

    const top10 = updatedStatistic.filter((item) => item.rank <= 10);

    return {
      monthList: {
        top10,
      },
    };
  }
}
