import { IBeacons } from "./IBeacons";
import { IUtils } from "./IUtils";

export function getBeacons<
  Plugin,
  Config extends {
    fields: ReadonlyArray<any>;
  },
>(utils: IUtils<Plugin, Config>) {
  const now = new Date().getTime();
  const ts = now - utils.projectEnv.beaconLifeTime;
  const buf = utils.ca.getBeaconsBuffer(ts);

  const data: IBeacons = {};
  if (buf.length > 5) {
    const bsize = buf.readUint16LE(3);
    const n = (buf.length - 5) / bsize;
    for (let i = 0; i < n; ++i) {
      const b = utils.parseBeaconResult(utils.projectChannels, buf, i * bsize + 5);
      data[b.mac] = b;
      delete b.mac;
    }
  }
  return data;
}