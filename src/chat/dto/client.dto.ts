import { PartialType } from '@nestjs/mapped-types';

export class JoinRoomDto {
  roomId: string;
  nickname: string;
}

export class LeaveRoomDto extends PartialType(JoinRoomDto) {}

export class SendMessageDto {
  sender: string;
  message: string;
  roomId: string;
}
