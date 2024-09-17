import { Injectable } from '@nestjs/common';
import { User } from './users/users.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class AppService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async MongooseTest(): Promise<User[]> {
    return this.userModel.find().exec();
  }
}
