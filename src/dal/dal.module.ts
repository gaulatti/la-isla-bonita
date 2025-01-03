import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Assignment } from 'src/models/assignment.model';
import { Baseline } from 'src/models/baseline.model';
import { CwvMetric } from 'src/models/cwv.metric.model';
import { Engagement } from 'src/models/engagement.model';
import { Heartbeat } from 'src/models/heartbeat.model';
import { LighthouseScore } from 'src/models/lighthouse.score.model';
import { Membership } from 'src/models/membership.model';
import { Playlist } from 'src/models/playlist.model';
import { Plugin } from 'src/models/plugin.model';
import { Project } from 'src/models/project.model';
import { Pulse } from 'src/models/pulse.model';
import { Schedule } from 'src/models/schedule.model';
import { Slot } from 'src/models/slot.model';
import { Statistic } from 'src/models/statistic.model';
import { Strategy } from 'src/models/strategy.model';
import { Target } from 'src/models/target.model';
import { TargetUrl } from 'src/models/target.url.model';
import { Team } from 'src/models/team.model';
import { Trigger } from 'src/models/trigger.model';
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
      CwvMetric,
      LighthouseScore,
      Schedule,
      Target,
      Url,
      TargetUrl,
      Heartbeat,
      Baseline,
      Statistic,
      Engagement,
      Plugin,
      Strategy,
      Slot,
      Playlist,
      Trigger,
    ]),
  ],
  exports: [SequelizeModule],
  providers: [],
})
export class DalModule {}
