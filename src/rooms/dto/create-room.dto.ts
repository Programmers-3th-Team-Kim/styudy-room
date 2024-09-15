export class CreateRoomDto {
  title: string;

  tagList: string[];

  maxNum: number;

  notice: string;

  isPublic: boolean;

  isChat: boolean;

  imageUrl: string;
}
