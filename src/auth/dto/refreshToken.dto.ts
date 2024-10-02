export class UserDto {
  id: string;
  nickname: string;
  imageUrl: string;
  introduction: string;
}

export class RefreshTokenDto {
  accessToken: string;
  user: UserDto;
}
