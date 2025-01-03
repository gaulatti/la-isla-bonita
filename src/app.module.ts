import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule, SequelizeModuleOptions } from '@nestjs/sequelize';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssessmentsModule } from './assessments/assessments.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { CloudWatchService } from './core/cloudwatch/cloudwatch.service';
import { CoreModule } from './core/core.module';
import { DalModule } from './dal/dal.module';
import { EngineModule } from './engine/engine.module';
import { SettingsModule } from './settings/settings.module';

/**
 * The AWS Secrets Manager client.
 */
const secretsManager = new SecretsManagerClient();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const defaultConfig: SequelizeModuleOptions = {
          dialect: 'mysql',
          port: +3306,
          models: [join(__dirname, '**/*.model.ts')],
          autoLoadModels: true,
        };

        if (configService.get('USE_LOCAL_DATABASE') === 'true') {
          return {
            ...defaultConfig,
            host: configService.get('DB_HOST'),
            port: +configService.get('DB_PORT'),
            username: configService.get('DB_USERNAME'),
            password: configService.get('DB_PASSWORD'),
            database: configService.get('DB_DATABASE'),
          };
        }

        /**
         * Retrieve the secret from AWS Secrets Manager.
         */
        const secretResponse = await secretsManager.send(
          new GetSecretValueCommand({
            SecretId: configService.get('DB_CREDENTIALS'),
          }),
        );

        /**
         * If the secret response contains a secret string, parse it and return the database configuration.
         */
        if (secretResponse.SecretString) {
          const { host, port, username, password, database } = JSON.parse(
            secretResponse.SecretString,
          );

          const remoteConfig = {
            ...defaultConfig,
            host: host,
            port: +port,
            username,
            password,
            database,
          };

          return {
            ...remoteConfig,
          };
        }
      },
      inject: [ConfigService],
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    CoreModule,
    DalModule,
    SettingsModule,
    AuthorizationModule,
    AssessmentsModule,
    EngineModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    CloudWatchService,
    /**
     * Disabling by now, as it's publishing a metric per every URL hit.
     * That will skyrocket the costs.
     *
     * https://github.com/gaulatti/autobahn-service/issues/1
     */
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: MetricsInterceptor,
    // },
  ],
})
export class AppModule {}
