import { Module } from '@nestjs/common';
import { SocketService } from './socket.service';
import { SocketGateway } from './socket.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { Room, RoomSchema } from 'src/rooms/rooms.schema';
import { User, UserSchema } from 'src/users/users.schema';
import { Planner, PlannerSchema } from 'src/planners/planners.schema';
import { Statistic, StatisticSchema } from 'src/statistics/statistics.schema';
import { AuthModule } from 'src/auth/auth.module';
import { Temp, TempSchema } from './temps.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      { name: User.name, schema: UserSchema },
      { name: Planner.name, schema: PlannerSchema },
      { name: Statistic.name, schema: StatisticSchema },
      { name: Temp.name, schema: TempSchema },
    ]),
    AuthModule,
  ],
  providers: [SocketGateway, SocketService],
})
export class SocketModule {}
