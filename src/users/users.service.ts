import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from './users.schema';
import { CreateUserDto } from './dto/createUser.dto';
import { UpdateUserProfileDto } from './dto/updateUserProfile.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async checkDuplicate(field: string, value: string): Promise<boolean> {
    const user = await this.userModel.findOne({ [field]: value }).exec();
    return !!user;
  }

  async findOneById(id: string): Promise<User | null> {
    const user = await this.userModel.findOne({ id }).exec();

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
    return user;
  }

  async updateProfile(id: string, updateUserProfileDto: UpdateUserProfileDto) {
    const user = await this.findOneById(id);

    user.imageUrl = updateUserProfileDto.imageUrl;
    user.nickname = updateUserProfileDto.nickname;
    user.introduction = updateUserProfileDto.introduction;

    return user.save();
  }

  async deleteAccount(id: string): Promise<void> {
    const user = await this.findOneById(id);
    await this.userModel.deleteOne({ id: user.id });
  }

  async findById(userId: Types.ObjectId) {
    return await this.userModel.findOne({ _id: userId });
  }
}
