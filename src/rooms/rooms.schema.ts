import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ collection: 'Rooms', strict: true })
export class Room {
  @Prop({ required: true })
  title: string;

  @Prop()
  tagList: string[];

  @Prop()
  notice: string;

  @Prop({ required: true })
  maxNum: number;

  @Prop({ default: 1 })
  currentNum: number;

  @Prop({ required: true })
  isPublic: boolean;

  @Prop()
  password?: string;

  @Prop({ required: true })
  isChat: boolean;

  @Prop()
  imageUrl: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  roomManager: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'User' })
  member: Types.ObjectId[];

  @Prop({ type: Date, default: Date.now() })
  createdAt: Date;
}

export const RoomSchema = SchemaFactory.createForClass(Room);
