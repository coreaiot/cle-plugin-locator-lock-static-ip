import { Context } from 'koa';
import { checkSum1B } from './checkSum1B';
import { IBinaryCommand, IGatewayResult, IStringCommand, Utils, parseHttpRequestBody } from '@lib';

const cmdLockStaticIp: IBinaryCommand = {
  cmd: 0x03,
  result: b => {
    if (!b.length) return false;
    if (b[b.length - 1] !== checkSum1B(b.subarray(0, b.length - 1))) return false;
    if (b[b.length - 2] !== 0x01) return false;
    return b;
  },
};

const cmdUnlockStaticIp: IBinaryCommand = {
  cmd: 0x05,
  result: b => {
    if (!b.length) return false;
    if (b[b.length - 1] !== checkSum1B(b.slice(0, b.length - 1))) return false;
    if (b[b.length - 2] !== 0x01) return false;
    return b;
  },
};

const cmdRst: IStringCommand = {
  cmd: 'AT+RST',
  result: /^\+OKRST/,
};

export function findLocator(utils: Utils, ctx: Context) {
  const requestBody = parseHttpRequestBody<IBody>(ctx);
  if (!requestBody || typeof requestBody.mac !== 'string') {
    throw 'Invalid request body.';
  }
  const gateways = (() => {
    const locators: IGatewayResult[] = [];
    const now = new Date().getTime();
    const ts = now - utils.projectEnv.locatorLifeTime;
    const buf = utils.ca.getLocatorsBuffer(0);
    if (buf.length > 5) {
      const bsize = buf.readUint16LE(3);
      const n = (buf.length - 5) / bsize;
      for (let i = 0; i < n; ++i) {
        const l = utils.parseLocatorResult(buf, i * bsize + 5, ts);
        locators.push(l);
      }
    }
    return locators;
  })();
  const locator = gateways.find(g => g.macHex === requestBody.mac.replace(/:/g, '').toLowerCase());
  if (!locator) {
    throw 'Locator not found.';
  }
  if (!locator.ip || !locator.info || !locator.info.LAN) {
    throw 'Locator not ready.';
  }
  return locator;
}

export async function lockStaticIp(utils: Utils, locator: IGatewayResult, timeoutTs: number) {
  const { take, timeout, catchError } = utils.modules.rxjsOperators;
  const { throwError, TimeoutError } = utils.modules.rxjs;

  const b = Buffer.alloc(13);
  const a = [
    ...locator.info.LAN.ip.split('.').map(x => parseInt(x, 10)),
    ...locator.info.LAN.subnetMask.split('.').map(x => parseInt(x, 10)),
    ...locator.info.LAN.defaultGateway.split('.').map(x => parseInt(x, 10)),
  ];

  for (let i = 0; i < 12; i++) b[i] = a[i];
  b[12] = 1;

  const res = await utils.udp.sendBinaryCmd(locator.macHex, cmdLockStaticIp, b)
    .pipe(
      timeout(timeoutTs),
      catchError(err => {
        if (err instanceof TimeoutError) {
          throw 'Lock static ip timeout';
        }
        return throwError(err);
      }),
      take(1),
    )
    .toPromise();
  if (!res) {
    throw 'Lock static ip failed';
  }

  await reset(utils, locator.macHex, 5000);
}

export async function unlockStaticIp(utils: Utils, locator: IGatewayResult, timeoutTs: number) {
  const { take, timeout, catchError } = utils.modules.rxjsOperators;
  const { throwError, TimeoutError } = utils.modules.rxjs;

  const res = await utils.udp.sendBinaryCmd(locator.macHex, cmdUnlockStaticIp)
    .pipe(
      timeout(timeoutTs),
      catchError(err => {
        if (err instanceof TimeoutError) {
          throw 'Unlock static ip timeout';
        }
        return throwError(err);
      }),
      take(1),
    )
    .toPromise();
  if (!res) {
    throw 'Unlock static ip failed';
  }

  await reset(utils, locator.macHex, 5000);
}

async function reset(utils: Utils, mac: string, timeoutTs: number) {
  const { take, timeout, catchError } = utils.modules.rxjsOperators;
  const { throwError, TimeoutError } = utils.modules.rxjs;
  await utils.udp.sendStringCmd(mac, cmdRst)
    .pipe(
      timeout(timeoutTs),
      catchError(err => {
        if (err instanceof TimeoutError) {
          throw 'Reset locator timeout';
        }
        return throwError(err);
      }),
      take(1),
    )
    .toPromise();
}

export interface IBody {
  mac: string; // 基站 MAC。
}
