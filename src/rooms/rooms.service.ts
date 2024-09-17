import { Injectable } from '@nestjs/common';
import { Room } from 'src/rooms/rooms.schema';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { ShowRoomDto } from './dto/showRoom.dto';
import { CreateRoomDto } from './dto/createRoom.dto';

@Injectable()
export class RoomsService {
  constructor(@InjectModel(Room.name) private roomModel: Model<Room>) {}

  async createRoom(createRoomDto: CreateRoomDto): Promise<Room> {
    const createdRoom = new this.roomModel({
      ...createRoomDto,
      currentNum: 0,
      roomManager: 'jwt 토큰을 이용한 생성자 정보 저장',
      //new Types.ObjectId('603d6f4e8b3f2a3d54f1b2e9'), //토큰을 통해서 방생성자 저장
      member: [],
    });
    return createdRoom.save();
  }

  async showRoomList(showRoomDto: ShowRoomDto): Promise<Room[]> {
    const { search, isPublic, isPossible, offset, limit } = showRoomDto;
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
