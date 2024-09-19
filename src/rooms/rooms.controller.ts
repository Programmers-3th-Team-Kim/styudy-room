import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { ShowRoomDto } from './dto/showRoom.dto';
import { Room } from './rooms.schema';
import { AuthGuard } from '@nestjs/passport';
import { CreateRoomDto } from './dto/createRoom.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createRoom(
    @Body() createRoomDto: CreateRoomDto,
    @Req() req: any
  ): Promise<Room> {
    const { userId } = req.user;
    return this.roomsService.createRoom(createRoomDto, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async showRoomList(@Query() showRoomDto: ShowRoomDto): Promise<Room[]> {
    return this.roomsService.showRoomList(showRoomDto);
  }
}
