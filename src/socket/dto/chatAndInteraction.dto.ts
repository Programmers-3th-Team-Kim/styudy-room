export class SendChatDto {
  message: string;
}

export class ChatDto {
  time: string;
  message: string;
  nickname: string;
  imageUrl: string;
}

export class PayloadDto {
  plannerId: string;
  currentTime: number;
  totalTime?: number;
}
