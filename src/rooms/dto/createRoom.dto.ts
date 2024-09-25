import {
  ArrayMaxSize,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateRoomDto {
  @IsNotEmpty({ message: '방 제목은 필수입니다.' })
  @IsString({ message: '방 제목은 문자열이어야 합니다.' })
  @MaxLength(30, { message: '최대 30자까지 입력할 수 있습니다.' })
  title: string;

  @IsOptional()
  @IsString({ each: true, message: '태그는 문자열 배열이어야 합니다.' })
  @ArrayMaxSize(7, { message: '태그는 최대 7개까지만 가능합니다.' })
  @MaxLength(10, {
    each: true,
    message: '태그는 최대 10글자까지 입력 가능합니다.',
  })
  tagList: string[] = [];

  @IsNotEmpty({ message: '최대 인원 수는 필수입니다.' })
  @IsNumber({}, { message: '최대 인원 수는 숫자여야 합니다.' })
  @Min(1, { message: '최대 인원 수는 최소 1명 이상이어야 합니다.' })
  @Max(12, { message: '최대 인원 수는 12명을 초과할 수 없습니다.' })
  maxNum: number;

  @IsOptional()
  @IsString({ message: '공지사항은 문자열이어야 합니다.' })
  notice: string = '';

  @IsNotEmpty({ message: '공개 여부는 필수입니다.' })
  @IsBoolean({ message: '공개 여부는 true 또는 false 값이어야 합니다.' })
  isPublic: boolean;

  @ValidateIf((o) => o.isPublic === false)
  @IsNotEmpty({
    message: '비밀번호는 공개 여부가 false일 때 반드시 입력되어야 합니다.',
  })
  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @MinLength(1, { message: '비밀번호는 최소 1자 이상이어야 합니다.' })
  password: string = '';

  @IsNotEmpty({ message: '채팅 여부는 필수입니다.' })
  @IsBoolean({ message: '채팅 여부는 true 또는 false 값이어야 합니다.' })
  isChat: boolean;

  @IsOptional()
  @IsString({ message: '이미지 URL은 문자열이어야 합니다.' })
  imageUrl: string = '';
}
