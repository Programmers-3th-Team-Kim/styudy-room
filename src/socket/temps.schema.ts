import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ collection: 'Temps', strict: 'throw', minimize: false })
export class Temp {
  @Prop({ required: true })
  plannerId: Types.ObjectId;

  @Prop({ required: true })
  plannerStartTime: number;

  @Prop({ default: 0 })
  maxStartTime: number;

  @Prop({ default: 0 })
  restStartTime: number;

  @Prop({
    default: new Date()
      .toLocaleDateString('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .replace(/\s/g, ''),
  })
  date: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;
}

export const TempSchema = SchemaFactory.createForClass(Temp);
