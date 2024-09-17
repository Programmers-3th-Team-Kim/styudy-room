import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatDto, NoticeDto } from './dto/server.dto';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Planner } from 'src/planners/planners.schema';
import { User } from 'src/users/users.schema';
import { Room } from 'src/rooms/rooms.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(Planner.name) private plannerModel: Model<Planner>
  ) {}

  joinChat(
    server: Server,
    client: Socket,
    roomId: string,
    nickname: string
  ): void {
    client.join(roomId);
    const noticeData: NoticeDto = {
      type: 'notice',
      message: `${nickname}님께서 입장하셨습니다.`,
    };
    server.to(roomId).emit('notice', noticeData);
  }

  leaveChat(
    server: Server,
    client: Socket,
    roomId: string,
    nickname: string
  ): void {
    client.leave(roomId);
    const noticeData: NoticeDto = {
      type: 'notice',
      message: `${nickname}님께서 퇴장하셨습니다.`,
    };
    server.to(roomId).emit('notice', noticeData);
  }

  async joinRoom(
    client: Socket,
    roomId: string,
    userId: mongoose.Types.ObjectId,
    nickname: string
  ) {
    const roomData = await this.roomModel.findById(
      new mongoose.Types.ObjectId(roomId)
    );
    roomData.currentMember.push(userId);
    roomData.currentNum += 1;
    const { _id, title, notice, password, currentMember, currentNum, isChat } =
      roomData;
    await this.roomModel.updateOne({ _id }, { currentMember, currentNum });

    let roomManager: string;
    const memberNicknameList: string[] = [];
    roomData.currentMember.forEach(async (userId) => {
      const results = await this.userModel.findById(userId);
      memberNicknameList.push(results.nickname);
      if (userId === roomData.roomManager) {
        roomManager = results.nickname;
      }
    });

    const today = new Date();
    const yesterday = new Date(
      today.setDate(today.getDate() - 1)
    ).toLocaleDateString('en-CA');
    const tomorrow = new Date(
      today.setDate(today.getDate() + 2)
    ).toLocaleDateString('en-CA');
    const plannerData = await this.plannerModel.find(
      {
        userId,
        date: { $gte: yesterday, $lte: tomorrow },
      },
      { _id: false, todo: true, isComplete: true, date: true }
    );
    // console.log(plannerData);

    const resultsData: any = {
      title,
      notice,
      password,
      roomManager,
      currentMember: memberNicknameList,
      planner: plannerData,
    };

    client.to(roomId).emit('receiveRoomInfo', resultsData);
    client.broadcast.to(roomId).emit('updateMember', { nickname, state: 'In' });
    return isChat;
  }

  async leaveRoom(
    client: Socket,
    roomId: string,
    userId: mongoose.Types.ObjectId
  ) {
    const roomData = await this.roomModel.findById(
      new mongoose.Types.ObjectId(roomId)
    );
    roomData.currentMember.filter((value) => value !== userId);
    roomData.currentNum -= 1;

    const { _id, currentMember, currentNum, isChat } = roomData;
    await this.roomModel.updateOne({ _id }, { currentMember, currentNum });

    return isChat;
  }

  sendChat(
    server: Server,
    roomId: string,
    sender: string,
    message: string
  ): void {
    const chatData: ChatDto = {
      type: 'chat',
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      message,
      sender,
    };
    server.to(roomId).emit('message', chatData);
  }
}
