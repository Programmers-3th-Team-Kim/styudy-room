import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlannerDocument = Planner & Document;

@Schema({ collection: 'Planners' })
export class Planner {
  @Prop()
  subject: string;

  @Prop({ required: true })
  todo: string;

  @Prop()
  repeat: string;

  @Prop({ default: false, required: true })
  isComplete: boolean;

  @Prop({ required: true })
  date: string;

  @Prop()
  startTime: string;

  @Prop()
  endTime: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ type: [{ startTime: String, endTime: String }] })
  timelines: {
    startTime: string;
    endTime: string;
  }[];
}

export const PlannerSchema = SchemaFactory.createForClass(Planner);
