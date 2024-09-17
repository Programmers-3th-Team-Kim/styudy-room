import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

class StartEndTime {
  startTime: string;
  EndTime: string;
}

@Schema({ collection: 'Planners', strict: true })
export class Planner {
  @Prop()
  subject: string;

  @Prop({ required: true })
  todo: string;

  @Prop()
  beforeTime: StartEndTime;

  @Prop()
  afterTime: StartEndTime;

  @Prop()
  repeat: string;

  @Prop({ default: false })
  isComplete: boolean;

  @Prop({ required: true })
  date: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;
}

export const PlannerSchema = SchemaFactory.createForClass(Planner);
