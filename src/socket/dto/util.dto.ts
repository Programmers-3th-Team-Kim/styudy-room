export class SocketQueryDto {
  roomId: string;
  nickname: string;
  imageUrl: string;
}

export class RoomManagerAndMembersToNicknameDto {
  roomManager: string;
  currentMember: string[];
}

export class SplitTimeIntoIntervalsDto {
  date: string;
  night: number;
  morning: number;
  afternoon: number;
  evening: number;
  totalTime: number;
  timelineList: {
    startTime: {
      date: string;
      time: string;
    };
    endTime: {
      date: string;
      time: string;
    };
  };
}
