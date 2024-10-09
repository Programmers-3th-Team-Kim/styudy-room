import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { RankingsService } from './rankings.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('jwt')
  async getRankingsJwt(@Req() req: any) {
    return this.rankingsService.getRankingsJwt(req.user._id);
  }

  @Get()
  async getRankings() {
    return this.rankingsService.getRankings();
  }
}
