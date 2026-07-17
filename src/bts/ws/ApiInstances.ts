import ChainWebSocket from "./ChainWebSocket";
import GrapheneApi from "./GrapheneApi";
import ChainConfig from "./ChainConfig";

// Faithful port of bitsharesjs-ws `src/ApiInstances.js`.
//
// The reference library is built around a single, long-lived, shared
// connection. This app, however, calls `Apis.instance(node, true, ...)`
// from ~40 different nanoeffect fetchers, many of them *concurrently*, and
// each one calls `currentAPI.close()` when it is done. The literal
// reference implementation cannot survive that usage pattern: every
// `instance(node, true)` would tear down the shared singleton socket and
// replace it with a brand new one, racing the in-flight `init_promise` and
// producing `websocket state error:0` (calls dispatched while the new
// socket was still CONNECTING) and cascading `-32601 Method not found`
// errors (calls dispatched against an abandoned/half-initialized socket).
//
// The two behavior-preserving deviations below make the singleton safe for
// the app's open-per-call pattern:
//
//  1. `connect()` is idempotent. If we are already connecting to or
//     connected with the same URL + api flags, it reuses the existing
//     `init_promise`/`ws_rpc` instead of opening a new socket. This keeps a
//     single shared connection for every concurrent caller.
//
//  2. `close()` is reference-counted. Each `instance()` call bumps a
//     counter; `close()` only actually tears the underlying socket down
//     once the last holder has released it (after a short idle grace period
//     so back-to-back callers reuse the same socket). A caller's
//     `currentAPI.close()` therefore never kills a sibling's in-flight
//     request. `reset()` / `destroy()` perform a hard teardown.

var autoReconnect = false; // by default don't use reconnecting-websocket

var Apis: any = null;
var statusCb: any = null;

export const setRpcConnectionStatusCallback = (callback: any) => {
  statusCb = callback;
  if (Apis) Apis.setRpcConnectionStatusCallback(callback);
};

export const setAutoReconnect = (auto: boolean) => {
  autoReconnect = auto;
};

export const reset = (
  cs: string = "ws://localhost:8090",
  connect: boolean,
  connectTimeout: number = 4000,
  optionalApis: any,
  closeCb: any
) => {
  return destroy().then(() => {
    Apis = newApis(cs, !!connect, connectTimeout, optionalApis, closeCb);
    Apis.setRpcConnectionStatusCallback(statusCb);
    if (connect) Apis.connect(cs, connectTimeout, optionalApis, closeCb);
    return Apis;
  });
};

export const instance = (
  cs: string = "ws://localhost:8090",
  connect: boolean = false,
  connectTimeout: number = 4000,
  optionalApis: any = { enableCrypto: false, enableOrders: false },
  closeCb: any = null
) => {
  if (!Apis) {
    Apis = newApis(cs, !!connect, connectTimeout, optionalApis, closeCb);
    Apis.setRpcConnectionStatusCallback(statusCb);
  }

  if (connect) {
    Apis.connect(cs, connectTimeout, optionalApis, closeCb);
  }

  // Track this caller as a holder of the shared connection.
  Apis.retain();

  if (closeCb) Apis.closeCb = closeCb;
  return Apis;
};

export const chainId = () => {
  return instance().chain_id;
};

// Refcounted release. Mirrors the reference `Apis.close()` from the caller's
// point of view (it releases *this* caller's* connection), but does not
// tear the shared socket down while other holders still need it.
export const close = async () => {
  if (Apis) {
    Apis.release();
  }
};

// Force a hard teardown of the underlying socket and clear the singleton.
// Used by `reset()` and for explicit full shutdown.
export const destroy = async () => {
  if (Apis) {
    Apis.cancelScheduledClose();
    await Apis.hardClose();
    Apis = null;
  }
};

const get = (name: string) =>
  new Proxy([], {
    get: (_, method) => (...args: any[]) => Apis[name].exec(method, [...args]),
  });

export const db = get("_db");
export const network = get("_net");
export const history = get("_hist");
export const crypto = get("_crypt");
export const orders = get("_orders");

const newApis = (
  cs: string,
  shouldConnect: boolean,
  connectTimeout: number,
  optionalApis: any,
  closeCb: any
) => {
  const state = {
    url: cs,
    ws_rpc: null as any,
    statusCb: null as any,
    init_promise: null as Promise<any> | null,
    chain_id: null as string | null,
    _db: null as any,
    _net: null as any,
    _hist: null as any,
    _crypt: null as any,
    _orders: null as any,
    closeCb: closeCb,
    refs: 0,
    destroyed: false,
    _idleTimer: null as any,
    _optionalApis: optionalApis,
  };

  const apiFlags = (o: any = {}) => ({
    enableCrypto: !!o.enableCrypto,
    enableOrders: !!o.enableOrders,
  });

  const doConnect = (
    connectUrl: string,
    connTimeout: number = 4000,
    opts: any = { enableCrypto: false, enableOrders: false },
    cb: any = null
  ) => {
    state._optionalApis = opts;

    // A no-arg `.connect()` (or any call without a URL) should reuse the
    // already-configured `state.url` rather than open a `ChainWebSocket(undefined)`.
    if (connectUrl == null) connectUrl = state.url;

    // Idempotent: reuse the existing socket/init when connecting to the
    // same URL with the same optional apis. This is the core fix for the
    // "websocket state error:0" / "-32601 Method not found" races.
    const f = apiFlags(opts);
    const cur = apiFlags(state._optionalApis);
    if (
      state.ws_rpc &&
      state.url === connectUrl &&
      state.init_promise &&
      !state.destroyed &&
      f.enableCrypto === cur.enableCrypto &&
      f.enableOrders === cur.enableOrders
    ) {
      return state.init_promise;
    }

    state.url = connectUrl;
    let rpc_user = "",
      rpc_password = "";
    if (
      typeof (globalThis as any).window !== "undefined" &&
      (globalThis as any).window.location &&
      (globalThis as any).window.location.protocol === "https:" &&
      connectUrl.indexOf("wss://") < 0
    ) {
      throw new Error("Secure domains require wss connection");
    }

    if (state.ws_rpc) {
      state.ws_rpc.statusCb = null;
      state.ws_rpc.keepAliveCb = null;
      state.ws_rpc.on_close = null;
      state.ws_rpc.on_reconnect = null;
      // Best-effort: drop the prior socket (e.g. switching nodes).
      try {
        state.ws_rpc.close();
      } catch (e) {
        /* ignore */
      }
      state.ws_rpc = null;
    }

    state.destroyed = false;

    state.ws_rpc = new ChainWebSocket(
      connectUrl,
      state.statusCb,
      connTimeout,
      autoReconnect,
      (closed: boolean) => {
        if (state._db && !closed) {
          state._db.exec("get_objects", [["2.1.0"]]).catch(() => {});
        }
      }
    );

    state.init_promise = state.ws_rpc
      .login(rpc_user, rpc_password)
      .then(() => {
        // The connection may have been closed/replaced while login was in
        // flight. Bail out rather than touching a null ws_rpc.
        if (!state.ws_rpc || state.destroyed) return;

        state._db = new GrapheneApi(state.ws_rpc, "database");
        state._net = new GrapheneApi(state.ws_rpc, "network_broadcast");
        state._hist = new GrapheneApi(state.ws_rpc, "history");
        if (opts.enableOrders)
          state._orders = new GrapheneApi(state.ws_rpc, "orders");
        if (opts.enableCrypto)
          state._crypt = new GrapheneApi(state.ws_rpc, "crypto");

        var db_promise = state._db.init().then(() => {
          return state._db.exec("get_chain_id", []).then((_chain_id: string) => {
            state.chain_id = _chain_id;
            return ChainConfig.setChainId(_chain_id);
          });
        });

        state.ws_rpc.on_reconnect = () => {
          if (!state.ws_rpc || state.destroyed) return;
          state.ws_rpc.login("", "").then(() => {
            state._db.init().then(() => {
              if (state.statusCb) state.statusCb("reconnect");
            });
            state._net.init();
            state._hist.init();
            if (opts.enableOrders) state._orders.init();
            if (opts.enableCrypto) state._crypt.init();
          });
        };
        state.ws_rpc.on_close = () => {
          // Natural socket close: mark destroyed so the next connect opens
          // a fresh socket, and notify the close callback.
          state.destroyed = true;
          if (state.closeCb) {
            const c = state.closeCb;
            state.closeCb = null;
            c();
          }
        };

        let initPromises = [db_promise, state._net.init(), state._hist.init()];

        if (opts.enableOrders) initPromises.push(state._orders.init());
        if (opts.enableCrypto) initPromises.push(state._crypt.init());
        return Promise.all(initPromises);
      })
      .catch((err: any) => {
        console.error(
          connectUrl,
          "Failed to initialize with error",
          err && err.message
        );
        return Promise.resolve().then(() => {
          throw err;
        });
      });

    return state.init_promise;
  };

  const hardClose = async () => {
    state.destroyed = true;
    if (
      state.ws_rpc &&
      state.ws_rpc.ws &&
      state.ws_rpc.ws.readyState === 1
    ) {
      await state.ws_rpc.close();
    }
    state.ws_rpc = null;
    state.init_promise = null;
    state._db = null;
    state._net = null;
    state._hist = null;
    state._crypt = null;
    state._orders = null;
    state.refs = 0;
    state._idleTimer = null;
  };

  // When the last holder releases the connection we don't tear the socket
  // down immediately. Instead we wait a short grace period: if another
  // caller grabs the connection in the meantime (the normal case, since the
  // nanoeffects run back-to-back) the existing socket is reused and no
  // reconnect is needed. If the connection stays idle, it is closed so we
  // don't leak sockets. A natural `on_close` from the node sets
  // `state.destroyed` so the next `connect()` opens a fresh socket.
  const IDLE_CLOSE_MS = 5000;
  const scheduleClose = () => {
    if (state._idleTimer) return;
    state._idleTimer = setTimeout(() => {
      state._idleTimer = null;
      if (state.refs <= 0) {
        hardClose();
      }
    }, IDLE_CLOSE_MS);
  };
  const cancelScheduledClose = () => {
    if (state._idleTimer) {
      clearTimeout(state._idleTimer);
      state._idleTimer = null;
    }
  };

  // Lazy getter that waits for init_promise before invoking `.exec`, so
  // callers that don't await init_promise themselves stay race-free.
  const lazyApi = (key: string) =>
    new Proxy(
      {},
      {
        get: (_, prop) => {
          if (prop === "exec") {
            return (method: any, args: any[]) =>
              (state.init_promise || Promise.resolve()).then(() => {
                if (!state[key]) {
                  throw new Error(`${key} API not available`);
                }
                return state[key].exec(method, args);
              });
          }
          return (...a: any[]) => {
            if (state[key] && typeof state[key][prop] === "function") {
              return state[key][prop](...a);
            }
            return state[key] ? (state[key] as any)[prop] : undefined;
          };
        },
      }
    );

  return {
    retain: () => {
      // Grabbing the connection cancels any pending idle teardown.
      cancelScheduledClose();
      state.refs += 1;
      return state.refs;
    },
    release: () => {
      state.refs = Math.max(0, state.refs - 1);
      // Once the last holder lets go, schedule a graceful idle close so we
      // don't keep a socket open forever, but allow immediate reuse.
      if (state.refs <= 0) scheduleClose();
      return state.refs;
    },
    cancelScheduledClose,
    // NOTE: `close` here is the refcounted release. The hard teardown is
    // `hardClose` (used by destroy()/reset()). Callers invoke
    // `currentAPI.close()`, which must NOT kill siblings' sockets.
    close: function () {
      return (this as any).release();
    },
    hardClose,
    connect: doConnect,
    db_api: () => lazyApi("_db"),
    network_api: () => lazyApi("_net"),
    history_api: () => lazyApi("_hist"),
    crypto_api: () => lazyApi("_crypt"),
    orders_api: () => lazyApi("_orders"),
    setRpcConnectionStatusCallback: (callback: any) => (state.statusCb = callback),
    get chain_id() {
      return state.chain_id;
    },
    get init_promise() {
      return state.init_promise;
    },
    get closeCb() {
      return state.closeCb;
    },
    set closeCb(cb: any) {
      state.closeCb = cb;
    },
  };
};

const ApisExport = {
  instance,
  setRpcConnectionStatusCallback,
  setAutoReconnect,
  reset,
  chainId,
  close,
  destroy,
  db,
  network,
  history,
  crypto,
  orders,
};

export default ApisExport;
