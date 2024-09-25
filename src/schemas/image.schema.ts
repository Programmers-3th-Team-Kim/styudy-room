import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ImageDocument = Image & Document;

@Schema({ collection: 'Images' })
export class Image {
  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  filename: string;
}

export const ImageSchema = SchemaFactory.createForClass(Image);
