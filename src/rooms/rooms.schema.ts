import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ collection: 'Rooms', strict: 'throw', minimize: false })
export class Room {
  @Prop({ required: true })
  title: string;

  @Prop({ default: [] })
  tagList: string[];

  @Prop({ default: '' })
  notice: string;

  @Prop({ required: true })
  maxNum: number;

  @Prop({ required: true })
  isPublic: boolean;

  @Prop({ default: '' })
  password: string;

  @Prop({ required: true })
  isChat: boolean;

  @Prop({ default: '' })
  imageUrl: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  roomManager: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], default: [], ref: 'User' })
  currentMember: Types.ObjectId[];

  @Prop({ type: Date, default: Date.now() })
  createdAt: Date;
}

export const RoomSchema = SchemaFactory.createForClass(Room);
