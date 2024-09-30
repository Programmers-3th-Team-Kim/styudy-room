import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ collection: 'Temps', strict: 'throw', minimize: false })
export class Temp {
  @Prop({ required: true })
  plannerId: Types.ObjectId;

  @Prop({ default: 0 })
  maxStartTime: number;

  @Prop({ default: 0 })
  restStartTime: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;
}

export const TempSchema = SchemaFactory.createForClass(Temp);
