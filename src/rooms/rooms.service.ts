import { Injectable } from '@nestjs/common';
import { Room } from 'src/rooms/rooms.schema';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { RequestRoomDto } from './dto/requestRoom.dto';
import { CreateRoomDto } from './dto/createRoom.dto';
import { ResponseRoomDto } from './dto/responseRoom.dto';

@Injectable()
export class RoomsService {
  constructor(@InjectModel(Room.name) private roomModel: Model<Room>) {}

  async createRoom(
    createRoomDto: CreateRoomDto,
    userId: string
  ): Promise<Room> {
    const createdRoom = new this.roomModel({
      ...createRoomDto,
      roomManager: new Types.ObjectId(userId),
    });
    return createdRoom.save();
  }

  async showRoomList(
    requestRoomDto: RequestRoomDto
  ): Promise<ResponseRoomDto[]> {
    const { search, isPublic, isPossible, offset, limit } = requestRoomDto;
    const query: FilterQuery<Room> = {};

    if (search) {
      query['$or'] = [
        { title: { $regex: search, $options: 'i' } },
        { tagList: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    if (typeof isPublic !== 'undefined') {
      query['isPublic'] = isPublic;
    }

    if (typeof isPossible !== 'undefined') {
      query['$expr'] = isPossible
        ? { $gt: ['$maxNum', '$currentNum'] }
        : { $eq: ['$maxNum', '$currentNum'] };
    }

    const rooms = await this.roomModel
      .find(query, {
        password: false,
        isChat: false,
        roomManager: false,
        __v: false,
      })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .exec();

    const roomsData = rooms.map((room) => {
      const roomObject = room.toObject();

      const {
        _id,
        title,
        tagList,
        notice,
        maxNum,
        isPublic,
        imageUrl,
        createdAt,
        currentMember,
      } = roomObject;

      const roomDto: ResponseRoomDto = {
        _id,
        title,
        tagList,
        notice,
        maxNum,
        isPublic,
        imageUrl,
        createdAt,
        currentNum: currentMember.length,
      };

      return roomDto;
    });

    return roomsData;
  }
}
