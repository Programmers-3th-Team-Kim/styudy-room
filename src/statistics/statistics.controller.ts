import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { AuthGuard } from '@nestjs/passport';
import { CalendarDto, ResponseCalendarDto } from './dto/calendar.dto';
import { DailyDto, ResponseDailyDto } from './dto/daily.dto';
import { WeeklyMonthlyDto } from './dto/weeklyMonthly.dto';
import { AllGraph, AllLastAverage } from './dto/all.dto';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('my/calendar')
  async getCalendar(
    @Query() query: CalendarDto,
    @Req() req: any
  ): Promise<ResponseCalendarDto[]> {
    return this.statisticsService.getCalendar(query, req.user._id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my/daily')
  async getDailyStatistic(
    @Query() query: DailyDto,
    @Req() req: any
  ): Promise<ResponseDailyDto> {
    return this.statisticsService.getDailyStatistic(query, req.user._id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my/weekly')
  async getWeeklyStatistic(
    @Query('offset') offset: string = '0',
    @Req() req: any
  ): Promise<WeeklyMonthlyDto> {
    return this.statisticsService.getWeeklyStatistic(offset, req.user._id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my/monthly')
  getMonthlyStatistic(
    @Query('offset') offset: string = '0',
    @Req() req: any
  ): Promise<WeeklyMonthlyDto> {
    return this.statisticsService.getMonthlyStatistic(offset, req.user._id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('all/average')
  async getAllAverage(@Req() req: any): Promise<AllLastAverage> {
    return this.statisticsService.getAllLastAverage(req.user._id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('all/graph')
  async getAllGraph(
    @Query('offset') offset: string = '0',
    @Req() req: any
  ): Promise<AllGraph> {
    return this.statisticsService.getAllGraph(offset, req.user._id);
  }
}
