import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './users.schema';
import { CreateUserDto } from './dto/createUser.dto';

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
    return this.userModel.findOne({ id }).exec();
  }
}
