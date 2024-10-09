import { Types } from 'mongoose';

export class DailyRankingDto {
  userId: Types.ObjectId;
  totalTime: number;
  rank?: number;
}
