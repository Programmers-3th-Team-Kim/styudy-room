import { Module } from '@nestjs/common';
import { RankingsService } from './rankings.service';
import { RankingsController } from './rankings.controller';
import { StatisticsModule } from 'src/statistics/statistics.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [StatisticsModule, UsersModule],
  controllers: [RankingsController],
  providers: [RankingsService],
})
export class RankingsModule {}
