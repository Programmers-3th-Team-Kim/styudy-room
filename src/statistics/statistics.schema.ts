import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ collection: 'Statistics', strict: 'throw', minimize: false })
export class Statistic {
  toObject() {
    throw new Error('Method not implemented.');
  }
  @Prop({ required: true })
  date: string;

  @Prop({ default: 0 })
  totalTime: number;

  @Prop({ default: 0 })
  maxTime: number;

  @Prop({ default: 0 })
  restTime: number;

  @Prop({ default: 0 })
  morning: number;

  @Prop({ default: 0 })
  afternoon: number;

  @Prop({ default: 0 })
  evening: number;

  @Prop({ default: 0 })
  night: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;
}

export const StatisticSchema = SchemaFactory.createForClass(Statistic);
