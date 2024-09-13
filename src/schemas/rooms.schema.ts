import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema()
export class Room {
  @Prop({ required: true })
  title: string;

  @Prop()
  tagList: string[];

  @Prop()
  notice: string;

  @Prop({ required: true })
  maxNum: number;

  @Prop()
  currentNum: number;

  @Prop({ required: true })
  public: boolean;

  @Prop()
  password?: string;

  @Prop({ required: true })
  chat: boolean;

  @Prop()
  imageUrl: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  roomManager: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'User' })
  member: Types.ObjectId[];
}
