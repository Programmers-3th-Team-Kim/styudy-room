import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { Room, RoomSchema } from 'src/schemas/rooms.schema';
import { User, UserSchema } from 'src/schemas/users.schema';
import { Planner, PlannerSchema } from 'src/schemas/planners.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      { name: User.name, schema: UserSchema },
      { name: Planner.name, schema: PlannerSchema },
    ]),
  ],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
