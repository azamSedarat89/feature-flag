import { Controller, Post, Body, Param, Get, Query } from '@nestjs/common';
import { FlagsService } from './flags.service';
import { CreateFlagDto } from './dto/create-flag.dto';

@Controller('flags')
export class FlagsController {
  constructor(private readonly flagsService: FlagsService) {}

  @Post()
  async create(@Body() body: CreateFlagDto) {
    return this.flagsService.createFlag(body.name, body.dependencies);
  }

  @Post(':name/toggle')
  async toggleFlag(@Param('name') name: string, @Query('enable') enable: string) {
    return this.flagsService.toggleFlag(name, enable == 'true');
  }

  @Get(':name')
  async status(@Param('name') name: string) {
    return this.flagsService.getStatus(name);
  }

  @Get(':name/history')
  async history(@Param('name') name: string) {
    return this.flagsService.getHistory(name);
  }
}
