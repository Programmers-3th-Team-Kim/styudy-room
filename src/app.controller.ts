import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { User } from './users/users.schema';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async Test(): Promise<User[]> {
    return this.appService.MongooseTest();
  }
}
