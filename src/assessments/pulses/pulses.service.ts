import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { nanoid } from 'nanoid';
import { Op } from 'sequelize';
import { UsersService } from 'src/authorization/users/users.service';
import { NotificationsService } from 'src/core/notifications/notifications.service';
import { Logger } from 'src/logger/logger.decorator';
import { Heartbeat } from 'src/models/heartbeat.model';
import { Pulse } from 'src/models/pulse.model';
import { Target } from 'src/models/target.model';
import { Url } from 'src/models/url.model';
import { User } from 'src/models/user.model';
import { getPaginationParams, getSortParams } from 'src/utils/lists';
import { JSONLogger } from 'src/utils/logger';
import { prependWWW } from 'src/utils/pulses';
import { UrlsService } from '../urls/urls.service';
import { PulsesDto } from './pulses.dto';

/**
 * An instance of the AWS Lambda client.
 * This client is used to interact with AWS Lambda services.
 */
const lambdaClient = new LambdaClient();

@Injectable()
export class PulsesService {
  constructor(
    @InjectModel(Pulse)
    private readonly pulse: typeof Pulse,
    @Inject(forwardRef(() => UrlsService))
    private readonly urlsService: UrlsService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Logger instance for logging messages.
   */
  @Logger(PulsesService.name)
  private readonly logger!: JSONLogger;

  /**
   * Retrieves pulses by target ID within a specified date range and with optional pagination.
   *
   * @param id - The target ID to filter pulses.
   * @param from - The start date of the date range (optional).
   * @param to - The end date of the date range (optional).
   * @param startRow - The starting row for pagination (optional).
   * @param endRow - The ending row for pagination (optional).
   * @returns A promise that resolves to an object containing the pulses and the count of pulses.
   */
  pulsesByTarget(
    id: number,
    sort: string,
    from?: Date,
    to?: Date,
    startRow?: number,
    endRow?: number,
  ) {
    const paginationParams = getPaginationParams(startRow, endRow);

    return this.pulse.findAndCountAll({
      ...paginationParams,
      order: getSortParams(sort),
      where: {
        targetId: id,
        createdAt: {
          [Op.between]: [from, to],
        },
      },
      include: [
        { model: Heartbeat, as: 'heartbeats' },
        { model: Url, as: 'url' },
        Target,
      ],
    });
  }

  /**
   * Retrieves pulses by URL ID within a specified date range and pagination parameters.
   *
   * @param id - The URL ID to filter pulses.
   * @param from - The start date of the date range (optional).
   * @param to - The end date of the date range (optional).
   * @param startRow - The starting row for pagination (optional).
   * @param endRow - The ending row for pagination (optional).
   * @returns A promise that resolves to the list of pulses matching the criteria.
   */
  pulsesByUrl(
    id: number,
    sort: string,
    from?: Date,
    to?: Date,
    startRow?: number,
    endRow?: number,
  ) {
    const paginationParams = getPaginationParams(startRow, endRow);

    return this.pulse.findAndCountAll({
      ...paginationParams,
      order: getSortParams(sort),
      where: {
        urlId: id,
        createdAt: {
          [Op.between]: [from, to],
        },
      },
      include: [
        { model: Heartbeat, as: 'heartbeats' },
        { model: Url, as: 'url' },
      ],
    });
  }

  /**
   * Retrieves all pulses within a specified date range, with optional pagination.
   *
   * @param {Date} [from] - The start date for filtering pulses.
   * @param {Date} [to] - The end date for filtering pulses.
   * @param {number} [startRow] - The starting row for pagination.
   * @param {number} [endRow] - The ending row for pagination.
   * @returns {Promise<{ rows: Pulse[]; count: number }>} A promise that resolves to an object containing the rows of pulses and the total count.
   */
  async allPulses(
    sort: string,
    from?: Date,
    to?: Date,
    startRow?: number,
    endRow?: number,
  ): Promise<{ rows: Pulse[]; count: number }> {
    const paginationParams = getPaginationParams(startRow, endRow);

    return this.pulse.findAndCountAll({
      ...paginationParams,
      order: getSortParams(sort),
      include: [
        { model: Heartbeat, as: 'heartbeats' },
        { model: Url, as: 'url' },
        Target,
      ],
      where: {
        createdAt: {
          [Op.between]: [from, to],
        },
      },
      distinct: true,
    });
  }

  /**
   * Retrieves a pulse by its slug.
   *
   * @param slug - The unique identifier of the pulse.
   * @returns A promise that resolves to the Pulse object.
   *
   * The returned Pulse object includes associated models:
   * - Heartbeat
   * - Url
   * - Target
   * - Schedule (including Project)
   * - Membership (including User)
   */
  getPulse(slug: string): Promise<Pulse> {
    return this.pulse.findOne({
      where: { slug },
      include: [{ model: Heartbeat }, { model: Url }, { model: Target }],
    });
  }

  /**
   * Creates a new pulse record.
   *
   * @param dto - The data transfer object containing the pulse details.
   * @returns The created pulse record.
   *
   * @remarks
   * This method sanitizes the provided URL, retrieves the corresponding URL record,
   * generates a unique slug for the new pulse, and creates the pulse record in the database.
   * It also logs the creation of the pulse and broadcasts a notification to refresh the pulses table.
   */
  async createPulse(dto: PulsesDto) {
    const sanitizedUrl = prependWWW(dto.url);

    /**
     * Retrieve the URL record by the sanitized URL.
     */
    const urlRecord = await this.urlsService.urlByFQDN(sanitizedUrl);

    /**
     * Create a new pulse record.
     */
    const slug = nanoid();
    const pulse = await this.pulse.create({
      slug,
      urlId: urlRecord.id,
      playlistId: dto.playlistId,
    });

    this.logger.log(`Created pulse ${pulse.id} with slug ${slug}`);

    /**
     * Broadcast a notification to refresh the pulses table.
     */
    this.notificationsService.refreshPulsesTable();

    return pulse;
  }

  /**
   * Triggers a new pulse and associated heartbeats, then broadcasts a notification to refresh the pulses table.
   *
   * @param dto - Data transfer object containing the necessary information to create a pulse.
   * @returns An object containing the mobile and desktop heartbeat records.
   */
  async triggerPulse({ url }: PulsesDto, { id }: User) {
    /**
     * Retrieve the user record by the user ID.
     */
    const user = await this.usersService.findUser(id);

    /**
     * Invoke the adhoc trigger lambda function to create a new pulse.
     * By now we're using the first team assigned.
     */
    const params = {
      FunctionName: process.env.ADHOC_TRIGGER_LAMBDA_ARN,
      Payload: JSON.stringify({
        url,
        membership_id: user.memberships.find(Boolean).id,
        isBeta: process.env.IS_BETA == 'true',
      }),
    };

    try {
      const command = new InvokeCommand(params);
      await lambdaClient.send(command);
    } catch (error) {
      this.logger.error('Error invoking lambda:', error);
    }
  }
}
