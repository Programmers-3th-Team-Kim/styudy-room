import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class RequestRoomDto {
  @IsOptional()
  @IsString({ message: '검색어는 문자열이어야 합니다.' })
  search: string;

  @IsOptional()
  @IsBoolean({ message: '공개 여부는 true 또는 false 값이어야 합니다.' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  isPublic: boolean;

  @IsOptional()
  @IsBoolean({
    message: '참여 가능한 방 여부는 true 또는 false 값이어야 합니다.',
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  isPossible: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'limit은 숫자여야 합니다.' })
  @Min(1, { message: 'limit은 최소 1이어야 합니다.' })
  limit: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'offset은 숫자여야 합니다.' })
  @Min(0, { message: 'offset은 최소 0이어야 합니다.' })
  offset: number = 0;
}
