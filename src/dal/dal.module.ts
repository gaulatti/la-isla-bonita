import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Assignment } from 'src/models/assignment.model';
import { Baseline } from 'src/models/baseline.model';
import { Engagement } from 'src/models/engagement.model';
import { Heartbeat } from 'src/models/heartbeat.model';
import { Membership } from 'src/models/membership.model';
import { Project } from 'src/models/project.model';
import { Pulse } from 'src/models/pulse.model';
import { Schedule } from 'src/models/schedule.model';
import { Statistic } from 'src/models/statistic.model';
import { Target } from 'src/models/target.model';
import { Team } from 'src/models/team.model';
import { Url } from 'src/models/url.model';
import { User } from 'src/models/user.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Team,
      Membership,
      Project,
      User,
      Assignment,
      Pulse,
      Schedule,
      Target,
      Url,
      Heartbeat,
      Baseline,
      Statistic,
      Engagement,
    ]),
  ],
  exports: [SequelizeModule],
})
export class DalModule {}
