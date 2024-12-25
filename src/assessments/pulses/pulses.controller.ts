import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { User } from 'src/models/user.model';
import { PulsesDto } from './pulses.dto';
import { PulsesService } from './pulses.service';

/**
 * Controller for handling pulse-related operations.
 */
@Controller('pulses')
export class PulsesController {
  constructor(private readonly pulsesService: PulsesService) {}
  /**
   * Retrieves pulses based on the provided query parameters.
   *
   * @param {string} sort - The sorting criteria for the pulses.
   * @param {Date} from - The start date for filtering pulses.
   * @param {Date} to - The end date for filtering pulses.
   * @param {number} startRow - The starting row for pagination.
   * @param {number} endRow - The ending row for pagination.
   * @returns {Promise<any>} A promise that resolves to the list of pulses.
   */
  @Get()
  getPulses(
    @Query('sort') sort: string,
    @Query('from') from: Date,
    @Query('to') to: Date,
    @Query('startRow') startRow: number,
    @Query('endRow') endRow: number,
  ) {
    return this.pulsesService.allPulses(sort, from, to, startRow, endRow);
  }

  /**
   * Retrieves a pulse by its slug.
   *
   * @param slug - The unique identifier of the pulse.
   * @returns The pulse object associated with the given slug.
   */
  @Get(':slug')
  getPulse(@Param('slug') slug: string) {
    return this.pulsesService.getPulse(slug);
  }

  /**
   * Creates a new pulse.
   *
   * @param dto - The data transfer object containing the details of the pulse to be created.
   * @returns The created pulse.
   */
  @Post()
  createPulse(@Body() dto: PulsesDto, @Request() { user }: { user: User }) {
    return this.pulsesService.triggerPulse(dto, user);
  }
}
