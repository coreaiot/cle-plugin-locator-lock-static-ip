export * from './config';
export * from './status';
export * from './i18n';

import { Context } from 'koa';
import { Plugin, Utils, generateDocs } from '@lib';
import { findLocator, lockStaticIp, unlockStaticIp } from './locatorLockStaticIp';

export async function init(self: Plugin, utils: Utils) {
  const config = await utils.loadConfig(self);
  const packUri = (p: string) => {
    return config.apiPrefix + p;
  };
  self.status.status = 'idle';

  const errMsgBuzy = 'Busy now. Try later!';

  utils.http.apis.push(router => {
    const lockUri = packUri('/lock-static-ip');
    const unlockUri = packUri('/unlock-static-ip');

    router.post(lockUri, async (ctx: Context) => {
      if (self.debug)
        self.logger.debug(`POST ${lockUri}`);
      if (self.status.status !== 'idle') {
        ctx.status = 400;
        ctx.body = errMsgBuzy;
        return;
      }
      self.status.status = 'requesting';
      try {
        const locator = findLocator(utils, ctx);
        await lockStaticIp(utils, locator, 5000);
        ctx.status = 200;
        ctx.body = '';
      } catch (e) {
        ctx.status = 400;
        ctx.body = e;
      }
      self.status.status = 'idle';
    });

    router.post(unlockUri, async (ctx: Context) => {
      if (self.debug)
        self.logger.debug(`POST ${unlockUri}`);
      if (self.status.status !== 'idle') {
        ctx.status = 400;
        ctx.body = errMsgBuzy;
        return;
      }
      self.status.status = 'requesting';
      try {
        const locator = findLocator(utils, ctx);
        await unlockStaticIp(utils, locator, 5000);
        ctx.status = 200;
        ctx.body = '';
      } catch (e) {
        ctx.status = 400;
        ctx.body = e;
      }
      self.status.status = 'idle';
    });

  })
  return true;
}

export async function test(self: Plugin, utils: Utils) {
  self.logger.info('Test', self.name);
  self.logger.info('Loading Config ..');
  const config = await utils.loadConfig(self);
  console.log(config);
  self.logger.info('Test OK.');
}

export const docs = generateDocs();
