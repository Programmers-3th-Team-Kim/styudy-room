import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export class StartEndTime {
  startTime: string;
  EndTime: string;
}

@Schema({ collection: 'Planners' })
export class Planner {
  @Prop({ default: '' })
  subject: string;

  @Prop({ required: true })
  todo: string;

  @Prop({ required: true })
  date: string;

  @Prop({ default: '' })
  startTime: string;

  @Prop({ default: '' })
  endTime: string;

  @Prop({ default: [] })
  repeatDays: string[];

  @Prop({ default: 1 })
  repeatWeeks: number;

  @Prop({ default: false, required: true })
  isComplete: boolean;

  @Prop({ required: false })
  parentObjectId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ type: [{ startTime: String, endTime: String }] })
  timelineList: StartEndTime[];
}

export const PlannerSchema = SchemaFactory.createForClass(Planner);
