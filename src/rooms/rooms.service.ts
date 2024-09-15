import { Injectable } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Room } from 'src/schemas/rooms.schema';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { FilterQuery, Model } from 'mongoose';
import { ShowRoomDto } from './dto/show-room.dto';

@Injectable()
export class RoomsService {
  constructor(@InjectModel(Room.name) private roomModel: Model<Room>) {}

  async createRoom() {
    const createdRoom = new this.roomModel({
      title: 'tag12',
      tagList: ['tag12', 'tag9', 'tag4'],
      maxNum: 12,
      currentNum: 10,
      notice: 'awoeawi',
      isPublic: true,
      // password: '1234',
      isChat: true,
      imageUrl: '',
      roomManager: new mongoose.Types.ObjectId('603d6f4e8b3f2a3d54f1b2e9'),
      member: [new mongoose.Types.ObjectId('603d6f4e8b3f2a3d54f1b2e8')],
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
      if (isPossible) {
        query['$expr'] = { $gt: ['$maxNum', '$currentNum'] };
      } else {
        query['$expr'] = { $eq: ['$maxNum', '$currentNum'] };
      }
    }

    const rooms = await this.roomModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .exec();

    return rooms;
  }

  // findOne(id: number) {
  //   return `This action returns a #${id} room`;
  // }

  // update(id: number, updateRoomDto: UpdateRoomDto) {
  //   return `This action updates a #${id} room`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} room`;
  // }
}
