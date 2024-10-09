import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { RankingsService } from './rankings.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getRankings(@Req() req: any) {
    return this.rankingsService.getRankings(req.user._id);
  }
}
