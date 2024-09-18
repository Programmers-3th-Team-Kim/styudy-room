import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ collection: 'Planners', strict: true })
export class Statistic {
  @Prop({ required: true })
  date: string;

  @Prop()
  total: number;

  @Prop()
  max: number;

  @Prop()
  rest: number;

  @Prop()
  mornning: number;

  @Prop()
  afternoon: number;

  @Prop()
  evening: number;

  @Prop()
  night: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;
}

export const StatisticSchema = SchemaFactory.createForClass(Statistic);
