import { Transform, Type } from 'class-transformer';

export class ShowRoomDto {
  search?: string | undefined;

  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : undefined
  )
  isPublic?: boolean | undefined;

  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : undefined
  )
  isPossible?: boolean | undefined;

  @Type(() => Number)
  limit?: number = 9;

  @Type(() => Number)
  offset?: number = 0;
}
