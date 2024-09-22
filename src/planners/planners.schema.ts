import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

class StartEndTime {
  startTime: string;
  EndTime: string;
}

@Schema({ collection: 'Planners', strict: 'throw', minimize: false })
export class Planner {
  @Prop({ default: '' })
  subject: string;

  @Prop({ required: true })
  todo: string;

  @Prop({ default: '' })
  startTime: string;

  @Prop({ default: '' })
  endTime: string;

  @Prop({ default: [] })
  timeLineList: StartEndTime[];

  @Prop({ default: [] })
  repeatDays: string[];

  @Prop({ default: 0 })
  repeatWeeks: number;

  @Prop({ type: Types.ObjectId, default: null })
  parentObjectId: Types.ObjectId;

  @Prop({ default: false })
  isComplete: boolean;

  @Prop({ required: true })
  date: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;
}

export const PlannerSchema = SchemaFactory.createForClass(Planner);
