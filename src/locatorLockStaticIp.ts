import { Context } from 'koa';
import { checkSum1B } from './checkSum1B';
import { IBinaryCommand, IGatewayResultIndexedByMac, IStringCommand, Utils, parseHttpRequestBody } from './lib';

const cmdLockStaticIp: IBinaryCommand = {
  cmd: 0x03,
  result: b => {
    if (!b.length) return false;
    if (b[b.length - 1] !== checkSum1B(b.slice(0, b.length - 1))) return false;
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
  if (!requestBody || !requestBody.mac) {
    throw 'Invalid request body.';
  }
  const gateways = (() => {
    const now = new Date().getTime();
    const ts = now - utils.projectEnv.locatorLifeTime;
    const data = utils.packGatewaysByMac(utils.activeLocators, ts);
    return data;
  })();
  const locator = gateways[requestBody.mac];
  if (!locator) {
    throw 'Locator not found.';
  }
  if (!locator.ip || !locator.info || !locator.info.LAN) {
    throw 'Locator not ready.';
  }
  return locator;
}

export async function lockStaticIp(utils: Utils, locator: IGatewayResultIndexedByMac, timeoutTs: number) {
  const { take, timeout, catchError } = utils.modules.rxjsOperators;
  const { throwError, TimeoutError } = utils.modules.rxjs;

  const [ip, port] = locator.ip.split(':');
  const portNum = port ? ~~port : 8256;
  const ra = [ip, portNum].join(':');

  const ab = new ArrayBuffer(13);
  const u8a = new Uint8Array(ab);
  const a = [
    ...locator.info.LAN.ip.split('.').map(x => parseInt(x, 10)),
    ...locator.info.LAN.subnetMask.split('.').map(x => parseInt(x, 10)),
    ...locator.info.LAN.defaultGateway.split('.').map(x => parseInt(x, 10)),
  ];

  for (let i = 0; i < 12; i++) u8a[i] = a[i];
  u8a[12] = 1;

  const res = await utils.udp.sendBinaryCmd(cmdLockStaticIp, null, [ra], ab)
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

  await reset(utils, [ra], 5000);
}

export async function unlockStaticIp(utils: Utils, locator: IGatewayResultIndexedByMac, timeoutTs: number) {
  const { take, timeout, catchError } = utils.modules.rxjsOperators;
  const { throwError, TimeoutError } = utils.modules.rxjs;

  const [ip, port] = locator.ip.split(':');
  const portNum = port ? ~~port : 8256;
  const ra = [ip, portNum].join(':');

  const res = await utils.udp.sendBinaryCmd(cmdUnlockStaticIp, null, [ra])
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

  await reset(utils, [ra], 5000);
}

async function reset(utils: Utils, address: string[], timeoutTs: number) {
  const { take, timeout, catchError } = utils.modules.rxjsOperators;
  const { throwError, TimeoutError } = utils.modules.rxjs;
  await utils.udp.sendStringCmd(cmdRst, null, address)
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
