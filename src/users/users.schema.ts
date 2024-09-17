import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// DTO로 추후 재사용 가능
class DDay {
  date: Date;
  todo: string;
}

@Schema({ collection: 'Users', strict: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, unique: true })
  nickname: string;

  @Prop()
  imageUrl: string;

  @Prop()
  introduction: string;

  @Prop({ type: DDay })
  dDay: DDay;
}

export const UserSchema = SchemaFactory.createForClass(User);
