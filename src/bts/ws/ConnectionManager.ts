/**
 * Connection failover / latency manager, ported from btsjsws
 * `src/ConnectionManager.js`.
 *
 * Modernized:
 *  - URLs are derived from `src/config/chains.ts` `nodeList` (per chain)
 *    instead of being passed in explicitly. The reference manager still
 *    supports an explicit `url`/`urls` override.
 *  - uses the local `Apis` (refcounted) and `ChainWebSocket`.
 */

import * as Apis from "./ApiInstances";
import ChainWebSocket from "./ChainWebSocket";
import { chains } from "../../config/chains";

type OptionalApis = {
  enableCrypto?: boolean;
  enableOrders?: boolean;
};

type ManagerOpts = {
  url?: string;
  urls?: string[];
  autoFallback?: boolean;
  closeCb?: () => void;
  optionalApis?: OptionalApis;
  urlChangeCallback?: (url: string) => void;
  /** Chain key in `chains` (defaults to "bitshares"). */
  chain?: string;
};

class Manager {
  url: string | null;
  urls: string[];
  autoFallback: boolean;
  closeCb: (() => void) | null;
  optionalApis: OptionalApis;
  isConnected: boolean;
  urlChangeCallback?: (url: string) => void;

  constructor({
    url,
    urls,
    autoFallback,
    closeCb,
    optionalApis,
    urlChangeCallback,
    chain = "bitshares",
  }: ManagerOpts) {
    const chainNodeList: { url: string }[] =
      (chains as any)[chain]?.nodeList || [];

    // Start from the config node list; allow explicit override.
    const all = chainNodeList.map((n) => n.url);
    const primary = url || all[0] || null;
    const rest = urls || all.filter((u) => u !== primary);

    this.url = primary;
    this.urls = rest.filter((a) => a !== primary) as string[];
    this.autoFallback = autoFallback || false;
    this.closeCb = closeCb || null;
    this.optionalApis = optionalApis || {};
    this.isConnected = false;
    this.urlChangeCallback = urlChangeCallback;
  }

  setCloseCb = (cb: (() => void) | null) => {
    this.closeCb = cb;
  };

  static close() {
    return Apis.close();
  }

  logFailure = (method: string, url: string, err: any) => {
    let message = err && err.message ? err.message : "";
    console.error(
      method,
      "Failed to connect to " +
        url +
        (message ? " Error: " + JSON.stringify(message) : "")
    );
  };

  _onClose = () => {
    this.isConnected = false;

    if (this.closeCb) {
      this.closeCb();
      this.setCloseCb(null);
    }

    if (this.autoFallback) this.connectWithFallback();
  };

  connect = async (connect = true, url: string = this.url as string) => {
    try {
      // `Apis.instance(url, connect)` triggers the connection; `.connect(url)`
      // returns the (idempotent) init promise. Passing `url` again lets the
      // idempotent guard in ApiInstances match and reuse the live socket
      // instead of opening a `ChainWebSocket(undefined)`.
      let res = await (Apis as any)
        .instance(
          url,
          connect,
          undefined,
          this.optionalApis,
          this._onClose
        )
        .connect(url, undefined, this.optionalApis, this._onClose);

      this.url = url;
      this.isConnected = true;

      return res;
    } catch (err) {
      await Apis.close();
      throw err;
    }
  };

  connectWithFallback = async (
    connect = true,
    url: string = this.url as string,
    index = 0,
    resolve: ((value: any) => void) | null = null,
    reject: ((reason: any) => void) | null = null
  ): Promise<any> => {
    if (index >= this.urls.length)
      return reject
        ? reject(
            new Error(
              "Tried " +
                index +
                " connections, none of which worked: " +
                JSON.stringify(this.urls.concat(this.url as string))
            )
          )
        : Promise.reject(
            new Error(
              "Tried " +
                index +
                " connections, none of which worked: " +
                JSON.stringify(this.urls.concat(this.url as string))
            )
          );

    try {
      return await this.connect(connect, url);
    } catch (err) {
      if (this.urlChangeCallback) this.urlChangeCallback(this.urls[index]);
      return this.connectWithFallback(
        connect,
        this.urls[index],
        index + 1,
        resolve,
        reject
      );
    }
  };

  checkConnections = async (
    rpc_user = "",
    rpc_password = "",
    resolve?: (value: any) => void,
    reject?: (reason: any) => void
  ) => {
    let connectionStartTimes: { [url: string]: number } = {};

    let fullList = this.urls.concat(this.url as string);
    let connectionPromises = fullList.map(async (url) => {
      /* Use default timeout and no reconnecting-websocket */
      let conn = new ChainWebSocket(url, () => {}, undefined, false);
      connectionStartTimes[url] = new Date().getTime();

      try {
        await conn.login(rpc_user, rpc_password);

        let result = {
          [url]: new Date().getTime() - connectionStartTimes[url],
        };
        await conn.close();

        return result;
      } catch (err) {
        if (url === this.url) {
          this.url = this.urls[0];
        } else {
          this.urls = this.urls.filter((a) => a !== url);
        }
        await conn.close();
        return;
      }
    });

    try {
      let res = await Promise.all(connectionPromises);

      let final = res
        .filter((a) => !!a)
        .sort((a, b) => {
          return Object.values(a)[0] - Object.values(b)[0];
        })
        .reduce((f, a) => {
          let key = Object.keys(a)[0];
          f[key] = (a as any)[key];
          return f;
        }, {} as { [url: string]: number });

      console.log(
        `Checked ${res.length} connections, ${
          res.length - Object.keys(final).length
        } failed`
      );
      return final;
    } catch (err) {
      return this.checkConnections(rpc_user, rpc_password, resolve, reject);
    }
  };
}

export default Manager;
