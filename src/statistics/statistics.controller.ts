import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { CreateStatisticDto } from './dto/create-statistic.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('my/calendar/:date?')
  async getCalendar(@Param('date') date: string | undefined, @Req() req: any) {
    this.statisticsService.getCalendar(date, req.user.userId);
  }

  @Get('my/daily/:id')
  getDailyStatisticsInfo(@Body() createStatisticDto: CreateStatisticDto) {
    return this.statisticsService.create(createStatisticDto);
  }

  @Get('my/weekly/:date')
  getWeeklyStatisticsInfo() {
    return this.statisticsService.findAll();
  }

  @Get('my/monthly/:date')
  getMonthlyStatisticsInfo(@Param('id') id: string) {
    return this.statisticsService.findOne(+id);
  }
}
