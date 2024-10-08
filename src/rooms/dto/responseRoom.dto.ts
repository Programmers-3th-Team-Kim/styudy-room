import { Types } from 'mongoose';

export class ResponseRoomDto {
  _id: Types.ObjectId;
  title: string;
  tagList: string[];
  notice: string;
  maxNum: number;
  currentNum: number;
  isPublic: boolean;
  isChat: boolean;
  imageUrl: string;
  createdAt: Date;
}
