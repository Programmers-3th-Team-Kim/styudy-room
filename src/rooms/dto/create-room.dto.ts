export class CreateRoomDto {
  title: string;

  tagList: string[];

  maxNum: number;

  notice: string;

  isPublic: boolean;

  password?: string;

  isChat: boolean;

  imageUrl: string;
}
