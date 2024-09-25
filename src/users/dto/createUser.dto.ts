import {
  IsString,
  Matches,
  MinLength,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class CreateUserDto {
  @IsString({ message: '아이디는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '아이디를 입력해 주세요.' })
  @MinLength(6, { message: '아이디는 최소 6자 이상이어야 합니다.' })
  @MaxLength(16, { message: '아이디는 최대 16자 이내여야 합니다.' })
  @Matches(/^[a-z0-9]{6,16}$/, {
    message: '아이디는 영어와 숫자로 구성된 6~16글자여야 합니다.',
  })
  id: string;

  @IsString()
  @IsNotEmpty({ message: '닉네임을 입력해주세요.' })
  @MinLength(2, { message: '닉네임은 최소 2자 이상이어야 합니다.' })
  @MaxLength(8, { message: '닉네임은 최대 8자 이내여야 합니다.' })
  @Matches(/^[a-zA-Z가-힣0-9]{2,8}$/, {
    message: '닉네임은 영어, 한글, 숫자로 구성된 2~8글자여야 합니다.',
  })
  nickname: string;

  @IsString()
  @IsNotEmpty({ message: '비밀번호를 입력해주세요.' })
  @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다.' })
  @MaxLength(16, { message: '비밀번호는 최대 16자 이내여야 합니다.' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+=-]).{6,16}$/, {
    message: '비밀번호는 영어, 숫자, 특수문자를 포함한 6~16글자여야 합니다.',
  })
  password: string;
}
