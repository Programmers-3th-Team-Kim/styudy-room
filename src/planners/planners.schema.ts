import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export class StartEndTime {
  startTime: dateTime;
  EndTime: dateTime;
}

export class dateTime {
  date: string;
  time: string;
}

@Schema({ collection: 'Planners', strict: 'throw', minimize: false })
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

  @Prop({ default: 0 })
  totalTime: number;

  @Prop({ default: [] })
  repeatDays: string[];

  @Prop({ required: false })
  repeatEndDate: string;

  @Prop({ default: false })
  isComplete: boolean;

  @Prop({ required: false })
  parentObjectId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ default: [] })
  timelineList: StartEndTime[];
}

export const PlannerSchema = SchemaFactory.createForClass(Planner);
