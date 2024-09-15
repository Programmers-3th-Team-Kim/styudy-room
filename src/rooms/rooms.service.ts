import { Injectable } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { Room } from 'src/schemas/rooms.schema';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';

@Injectable()
export class RoomsService {
  constructor(@InjectModel(Room.name) private roomModel: Model<Room>) {}

  async createRoom(createRoomDto: CreateRoomDto) {
    const createdRoom = new this.roomModel({
      ...createRoomDto,
      currentNum: 0,
      roomManager: 'jwt 토큰을 이용한 생성자 정보 저장',
      //new Types.ObjectId('603d6f4e8b3f2a3d54f1b2e9'), //토큰을 통해서 방생성자 저장
      member: [],
    });
    return createdRoom.save();
  }

  async showRoomList(
    search?: string,
    isPublic?: boolean,
    isPossible?: boolean,
    limit?: number,
    offset?: number
  ) {
    console.log(limit, offset);
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
      .find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .exec();

    return rooms;
  }
}
