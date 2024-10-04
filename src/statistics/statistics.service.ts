import { Injectable } from '@nestjs/common';
import { CreateStatisticDto } from './dto/create-statistic.dto';
import { UpdateStatisticDto } from './dto/update-statistic.dto';
import { Statistic } from './statistics.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectModel(Statistic.name) private statisticModel: Model<Statistic>
  ) {}
  async getCalendar(date: string, userId: string) {
    // 데이터 형식이 YY-MM인지 유효성검사
    const month = date === undefined ? this.getFormattedMonth() : date;
    const statistic = await this.getMonthlyStatistics(userId, month, {
      _id: false,
      date: true,
      totalTime: true,
    });
    console.log(statistic);
  }

  create(createStatisticDto: CreateStatisticDto) {
    return 'This action adds a new statistic';
  }

  findAll() {
    return `This action returns all statistics`;
  }

  findOne(id: number) {
    return `This action returns a #${id} statistic`;
  }

  getFormattedMonth(): string {
    return new Date()
      .toLocaleDateString('en-CA', {
        year: 'numeric',
        month: '2-digit',
      })
      .replace(/\s/g, '');
  }

  async getMonthlyStatistics(
    userId: string,
    date: string,
    projectionFields?: Record<string, boolean>
  ): Promise<Statistic[]> {
    return await this.statisticModel.find(
      {
        userId: new Types.ObjectId(userId),
        date: {
          $gte: `${date}-01`,
          $lt: `${date}-32`,
        },
      },
      projectionFields
    );
  }
}
