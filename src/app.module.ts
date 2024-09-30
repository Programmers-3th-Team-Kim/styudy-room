import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MongooseConfigService } from './configs/mongoose.config.service';
import { User, UserSchema } from './users/users.schema';
import { RoomsModule } from './rooms/rooms.module';
import { AuthModule } from './auth/auth.module';
import { SocketModule } from './socket/socket.module';
import { PlannersModule } from './planners/planners.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './src/configs/.development.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useClass: MongooseConfigService,
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    RoomsModule,
    AuthModule,
    SocketModule,
    PlannersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
