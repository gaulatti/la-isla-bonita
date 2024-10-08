import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from './models/user.model';
import { ENUMS } from './consts';
import { Membership } from './models/membership.model';
import { Team } from './models/team.model';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(User)
    private readonly user: typeof User,
  ) {}

  /**
   * Initiates the kickoff process for a given user.
   *
   * @param user - An object containing the userId of the user to kickoff.
   * @returns A promise that resolves to an object containing enums, the user data, and an empty features array.
   */
  async kickoff(user: { userId: string }) {
    const me = await this.user.findOne({
      where: { sub: user.userId },
      include: [{ model: Membership, include: [{ model: Team }] }],
    });
    return { enums: ENUMS, me, features: [] };
  }
}
