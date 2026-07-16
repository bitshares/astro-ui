/**
 * Local blockchain state cache, narrowed/modernized port of bitsharesjs
 * `lib/chain/src/ChainStore.js`.
 *
 * Differences from the reference:
 *  - No `immutable` dependency. Cache maps hold plain JS objects; deep
 *    merges use `mergeDeep` (defined locally). Sets are native `Set`.
 *  - `bigi` -> native BigInt for the 2.1.0 participation calc.
 *  - Uses the local `Apis`, `ChainTypes`, `ChainValidation`, and
 *    `EmitterInstance`.
 *  - `fetchRecentHistory` / `requestAllDataForAccount` are omitted (not
 *    part of the narrowed core API). The remaining surface matches the
 *    reference method names so callers port cleanly.
 */

import { Apis } from "../ws";
import ChainTypes from "./ChainTypes";
import ChainValidation from "./ChainValidation";
import emitter from "./EmitterInstance";

const { object_type, impl_object_type } = ChainTypes;
const emitterInstance = emitter();

const op_history = parseInt(object_type.operation_history, 10);
const witness_object_type = parseInt(object_type.witness, 10);
const committee_member_object_type = parseInt(object_type.committee_member, 10);
const account_object_type = parseInt(object_type.account, 10);
const witness_prefix = "1." + witness_object_type + ".";
const committee_prefix = "1." + committee_member_object_type + ".";
const account_prefix = "1." + account_object_type + ".";

const objectTypesArray = Object.keys(object_type);
const implObjectTypesArray = Object.keys(impl_object_type);

let default_auto_subscribe = true;

function getObjectType(id) {
  let [one, two] = id.split(".");
  two = parseInt(two, 10);
  switch (one) {
    case "0":
      return "unknown";
    case "1":
      return objectTypesArray[two];
    case "2":
      return implObjectTypesArray[two];
    case "5":
      return "market";
    default:
  }
}

function timeStringToDate(time_string) {
  if (!time_string) return new Date("1970-01-01T00:00:00.000Z");
  if (!/Z$/.test(time_string)) time_string = time_string + "+00:00";
  return new Date(time_string);
}

// Plain-object deep merge (Immutable.Map.mergeDeep replacement).
function mergeDeep(target, source) {
  if (!isObject(target) || !isObject(source)) return source;
  const out = Object.assign({}, target);
  for (const key of Object.keys(source)) {
    if (isObject(source[key]) && isObject(target[key])) {
      out[key] = mergeDeep(target[key], source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

function isObject(val) {
  return val && typeof val === "object" && !Array.isArray(val);
}

class ChainStore {
  constructor() {
    /** tracks everyone who wants to receive updates when the cache changes */
    this.subscribers = new Set();
    this.subscribed = false;

    this.clearCache();
    // this.chain_time_offset is used to estimate the blockchain time
    this.chain_time_offset = [];
    this.dispatchFrequency = 40;
  }

  /**
   * Clears all cached state.  This should be called any time the network
   * connection is reset.
   */
  clearCache() {
    this.subbed_accounts = new Set();
    this.subbed_witnesses = new Set();
    this.subbed_committee = new Set();

    this.objects_by_id = new Map();
    this.accounts_by_name = new Map();
    this.assets_by_symbol = new Map();
    this.account_ids_by_key = new Map();
    this.account_ids_by_account = new Map();

    this.balance_objects_by_address = new Map();
    this.get_account_refs_of_keys_calls = new Set();
    this.get_account_refs_of_accounts_calls = new Set();
    this.account_history_requests = new Map();
    this.witness_by_account_id = new Map();
    this.workers = new Set();
    this.committee_by_account_id = new Map();
    this.objects_by_vote_id = new Map();
    this.fetching_get_full_accounts = new Map();
    this.get_full_accounts_subscriptions = new Map();
    clearTimeout(this.timeout);
    this.dispatched = false;
  }

  resetCache(subscribe_to_new) {
    this.subscribed = false;
    this.subError = null;
    this.clearCache();
    this.head_block_time_string = null;
    return this.init(subscribe_to_new).catch((err) => {
      throw err;
    });
  }

  setDispatchFrequency(freq) {
    this.dispatchFrequency = freq;
  }

  init(subscribe_to_new = true) {
    let reconnectCounter = 0;
    var _init = (resolve, reject) => {
      if (this.subscribed) return resolve();
      let db_api = Apis.instance().db_api();
      if (!db_api) {
        return reject(
          new Error(
            "Api not found, please initialize the api instance before calling the ChainStore"
          )
        );
      }
      return db_api
        .exec("get_objects", [["2.1.0"]])
        .then((optional_objects) => {
          for (let i = 0; i < optional_objects.length; i++) {
            let optional_object = optional_objects[i];
            if (optional_object) {
              let head_time = new Date(
                optional_object.time + "+00:00"
              ).getTime();
              this.head_block_time_string = optional_object.time;
              this.chain_time_offset.push(
                new Date().getTime() -
                  timeStringToDate(optional_object.time).getTime()
              );
              let now = new Date().getTime();
              let delta = (now - head_time) / 1000;

              if (delta < 60) {
                Apis.instance()
                  .db_api()
                  .exec("set_subscribe_callback", [
                    this.onUpdate.bind(this),
                    subscribe_to_new,
                  ])
                  .then(() => {
                    console.log("synced and subscribed, chainstore ready");
                    this.subscribed = true;
                    this.subError = null;
                    this.notifySubscribers();
                    resolve();
                  })
                  .catch((error) => {
                    this.subscribed = false;
                    this.subError = error;
                    this.notifySubscribers();
                    reject(error);
                    console.log("Error: ", error);
                  });
              } else {
                console.log("not yet synced, retrying in 1s");
                this.subscribed = false;
                reconnectCounter++;
                this.notifySubscribers();
                if (reconnectCounter > 5) {
                  this.subError = new Error(
                    "ChainStore sync error, please check your system clock"
                  );
                  return reject(this.subError);
                }
                setTimeout(_init.bind(this, resolve, reject), 1000);
              }
            } else {
              setTimeout(_init.bind(this, resolve, reject), 1000);
            }
          }
        })
        .catch((error) => {
          console.log("!!! Chain API error", error);
          this.objects_by_id.delete("2.1.0");
          reject(error);
        });
    };

    return new Promise((resolve, reject) => _init(resolve, reject));
  }

  _subTo(type, id) {
    let key = "subbed_" + type;
    if (!this[key].has(id)) this[key].add(id);
  }

  unSubFrom(type, id) {
    let key = "subbed_" + type;
    this[key].delete(id);
    this.objects_by_id.delete(id);
  }

  _isSubbedTo(type, id) {
    let key = "subbed_" + type;
    return this[key].has(id);
  }

  onUpdate(updated_objects) {
    let cancelledOrders = [];
    let closedCallOrders = [];

    for (let a = 0; a < updated_objects.length; ++a) {
      for (let i = 0; i < updated_objects[a].length; ++i) {
        let obj = updated_objects[a][i];
        if (ChainValidation.is_object_id(obj)) {
          let old_obj = this.objects_by_id.get(obj);
          const objectType = getObjectType(obj);

          switch (objectType) {
            case "limit_order":
              cancelledOrders.push(obj);
              if (old_obj) {
                let account = this.objects_by_id.get(old_obj.seller);
                if (account && account.orders && account.orders.has(obj)) {
                  let orders = new Set(account.orders);
                  orders.delete(obj);
                  account = Object.assign({}, account, { orders });
                  this.objects_by_id.set(account.id, account);
                }
              }
              break;

            case "call_order":
              closedCallOrders.push(obj);
              if (old_obj) {
                let account = this.objects_by_id.get(old_obj.borrower);
                if (
                  account &&
                  account.call_orders &&
                  account.call_orders.has(obj)
                ) {
                  let call_orders = new Set(account.call_orders);
                  call_orders.delete(obj);
                  account = Object.assign({}, account, {
                    call_orders,
                  });
                  this.objects_by_id.set(account.id, account);
                }
              }
              break;

            case "proposal":
              this.subbed_accounts.forEach((acc) => {
                let current = this.objects_by_id.get(acc);
                if (current) {
                  let proposals = new Set(current.proposals || []);
                  if (proposals.has(obj)) {
                    proposals.delete(obj);
                    current = Object.assign({}, current, {
                      proposals,
                    });
                    this.objects_by_id.set(current.id, current);
                  }
                }
              });
              break;
          }

          if (old_obj) this.objects_by_id.set(obj, null);
        } else {
          this._updateObject(obj);
        }
      }
    }

    if (cancelledOrders.length)
      emitterInstance.emit("cancel-order", cancelledOrders);
    if (closedCallOrders.length)
      emitterInstance.emit("close-call", closedCallOrders);

    this.notifySubscribers();
  }

  notifySubscribers() {
    if (!this.dispatched) {
      this.dispatched = true;
      this.timeout = setTimeout(() => {
        this.dispatched = false;
        this.subscribers.forEach((callback) => {
          callback();
        });
      }, this.dispatchFrequency);
    }
  }

  /** Add a callback that will be called anytime any object in the cache is updated */
  subscribe(callback) {
    if (this.subscribers.has(callback))
      return console.error("Subscribe callback already exists", callback);
    this.subscribers.add(callback);
  }

  /** Remove a callback that was previously added via subscribe */
  unsubscribe(callback) {
    if (!this.subscribers.has(callback))
      return console.error("Unsubscribe callback does not exists", callback);
    this.subscribers.delete(callback);
  }

  clearObjectCache(id) {
    this.objects_by_id.delete(id);
  }

  getObject(id, force = false, autosubscribe = null, no_full_account = false) {
    if (autosubscribe == null) {
      autosubscribe = default_auto_subscribe;
    }
    if (!ChainValidation.is_object_id(id))
      throw Error("argument is not an object id: " + JSON.stringify(id));

    let result = this.objects_by_id.get(id);
    let subChange =
      id.substring(0, account_prefix.length) == account_prefix &&
      !this.get_full_accounts_subscriptions.get(id, false) &&
      autosubscribe;

    if (result === null && !force) return result;
    if (result === undefined || force || subChange)
      return this.fetchObject(id, force, autosubscribe, no_full_account);
    if (result === true) return undefined;

    return result;
  }

  getObjectsByVoteIds(vote_ids) {
    let result = [];
    let missing = [];
    for (let i = 0; i < vote_ids.length; ++i) {
      let obj = this.objects_by_vote_id.get(vote_ids[i]);
      if (obj) result.push(this.getObject(obj));
      else {
        result.push(null);
        missing.push(vote_ids[i]);
      }
    }

    if (missing.length === 0) return result;

    Apis.instance()
      .db_api()
      .exec("lookup_vote_ids", [missing])
      .then((vote_obj_array) => {
        for (let i = 0; i < vote_obj_array.length; ++i) {
          if (vote_obj_array[i]) this._updateObject(vote_obj_array[i]);
        }
        this.notifySubscribers();
      })
      .catch((error) => {
        console.log("Error: ", error);
      });

    return result;
  }

  getAsset(id_or_symbol) {
    if (!id_or_symbol) return null;

    if (ChainValidation.is_object_id(id_or_symbol)) {
      let asset = this.getObject(id_or_symbol);
      if (
        asset &&
        asset.bitasset &&
        !asset.bitasset.current_feed
      ) {
        return undefined;
      }
      return asset;
    }

    let asset_id = this.assets_by_symbol.get(id_or_symbol);

    if (ChainValidation.is_object_id(asset_id)) {
      let asset = this.getObject(asset_id);
      if (
        asset &&
        asset.bitasset &&
        !asset.bitasset.current_feed
      ) {
        return undefined;
      }
      return asset;
    }

    if (asset_id === null) return null;
    if (asset_id === true) return undefined;

    Apis.instance()
      .db_api()
      .exec("lookup_asset_symbols", [[id_or_symbol]])
      .then((asset_objects) => {
        if (asset_objects.length && asset_objects[0])
          this._updateObject(asset_objects[0], true);
        else {
          this.assets_by_symbol.set(id_or_symbol, null);
          this.notifySubscribers();
        }
      })
      .catch((error) => {
        console.log("Error: ", error);
        this.assets_by_symbol.delete(id_or_symbol);
      });

    return undefined;
  }

  getAccountRefsOfKey(key) {
    if (this.get_account_refs_of_keys_calls.has(key))
      return this.account_ids_by_key.get(key);
    else {
      this.get_account_refs_of_keys_calls.add(key);

      Apis.instance()
        .db_api()
        .exec("get_key_references", [[key]])
        .then((vec_account_id) => {
          let refs = new Set();
          vec_account_id = vec_account_id[0];
          for (let i = 0; i < vec_account_id.length; ++i) {
            refs.add(vec_account_id[i]);
          }
          this.account_ids_by_key.set(key, refs);
          this.notifySubscribers();
        })
        .catch((err) => {
          console.error("get_key_references", err);
          this.account_ids_by_key.delete(key);
          this.get_account_refs_of_keys_calls.delete(key);
        });
      return undefined;
    }
    return undefined;
  }

  getAccountRefsOfAccount(account_id) {
    if (this.get_account_refs_of_accounts_calls.has(account_id))
      return this.account_ids_by_account.get(account_id);
    else {
      this.get_account_refs_of_accounts_calls.add(account_id);

      Apis.instance()
        .db_api()
        .exec("get_account_references", [account_id])
        .then((vec_account_id) => {
          let refs = new Set();
          for (let i = 0; i < vec_account_id.length; ++i) {
            refs.add(vec_account_id[i]);
          }
          this.account_ids_by_account.set(account_id, refs);
          this.notifySubscribers();
        })
        .catch((err) => {
          console.error("get_account_references", err);
          this.account_ids_by_account.delete(account_id);
          this.get_account_refs_of_accounts_calls.delete(account_id);
        });
      return undefined;
    }
    return undefined;
  }

  getBalanceObjects(address) {
    let current = this.balance_objects_by_address.get(address);
    if (current === undefined) {
      this.balance_objects_by_address.set(address, new Set());
      Apis.instance()
        .db_api()
        .exec("get_balance_objects", [[address]])
        .then((balance_objects) => {
          let set = new Set();
          for (let i = 0; i < balance_objects.length; ++i) {
            this._updateObject(balance_objects[i]);
            set.add(balance_objects[i].id);
          }
          this.balance_objects_by_address.set(address, set);
          this.notifySubscribers();
        })
        .catch(() => {
          this.balance_objects_by_address.delete(address);
        });
    }
    return this.balance_objects_by_address.get(address);
  }

  fetchObject(id, force = false, autosubscribe = null, no_full_account = false) {
    if (autosubscribe == null) {
      autosubscribe = default_auto_subscribe;
    }
    if (typeof id !== "string") {
      let result = [];
      for (let i = 0; i < id.length; ++i)
        result.push(this.fetchObject(id[i], force, autosubscribe));
      return result;
    }

    if (!this.subscribed && !force) return undefined;
    if (!ChainValidation.is_object_id(id))
      throw Error("argument is not an object id: " + id);

    if (id.search("1.2.") === 0 && !no_full_account)
      return this.fetchFullAccount(id, autosubscribe);
    if (id.search(witness_prefix) === 0) this._subTo("witnesses", id);
    if (id.search(committee_prefix) === 0) this._subTo("committee", id);

    let result = this.objects_by_id.get(id);
    if (result === undefined) {
      this.objects_by_id.set(id, true);
      if (!Apis.instance().db_api()) return null;
      Apis.instance()
        .db_api()
        .exec("get_objects", [[id]])
        .then((optional_objects) => {
          for (let i = 0; i < optional_objects.length; i++) {
            let optional_object = optional_objects[i];
            if (optional_object) {
              this._updateObject(optional_object, true);
            } else {
              this.objects_by_id.set(id, null);
              this.notifySubscribers();
            }
          }
        })
        .catch((error) => {
          console.log("!!! Chain API error", error);
          this.objects_by_id.delete(id);
        });
    } else if (result === true) return undefined;
    return result;
  }

  getAccount(name_or_id, autosubscribe = null) {
    if (autosubscribe == null) {
      autosubscribe = default_auto_subscribe;
    }
    if (!name_or_id) return null;

    if (typeof name_or_id === "object") {
      if (name_or_id.id) return this.getAccount(name_or_id.id, autosubscribe);
      else if (name_or_id.get)
        return this.getAccount(name_or_id.get("id"), autosubscribe);
      else return undefined;
    }

    if (ChainValidation.is_object_id(name_or_id)) {
      let account = this.getObject(name_or_id, false, autosubscribe);
      if (account === null) {
        return null;
      }
      const currentSub = this.get_full_accounts_subscriptions.get(
        name_or_id,
        false
      );
      if (
        (!currentSub && autosubscribe) ||
        account === undefined ||
        account.name === undefined
      ) {
        return this.fetchFullAccount(name_or_id, autosubscribe);
      }
      return account;
    } else if (ChainValidation.is_account_name(name_or_id, true)) {
      let account_id = this.accounts_by_name.get(name_or_id);
      if (account_id === null) return null;
      if (account_id === undefined)
        return this.fetchFullAccount(name_or_id, autosubscribe);

      return this.getObject(account_id, false, autosubscribe);
    } else {
      return null;
    }
  }

  getAccountName(id) {
    let account = this.objects_by_id.get(id);
    if (account === true) return undefined;
    if (!account) {
      this.getObject(id, false, false, true);
      return undefined;
    }
    return account.name;
  }

  getWitnessById(account_id) {
    let witness_id = this.witness_by_account_id.get(account_id);
    if (witness_id === undefined) {
      this.fetchWitnessByAccount(account_id);
      return undefined;
    } else if (witness_id) {
      this._subTo("witnesses", witness_id);
    }

    return witness_id ? this.getObject(witness_id) : null;
  }

  getCommitteeMemberById(account_id) {
    let cm_id = this.committee_by_account_id.get(account_id);
    if (cm_id === undefined) {
      this.fetchCommitteeMemberByAccount(account_id);
      return undefined;
    } else if (cm_id) {
      this._subTo("committee", cm_id);
    }
    return cm_id ? this.getObject(cm_id) : null;
  }

  fetchWitnessByAccount(account_id) {
    return new Promise((resolve, reject) => {
      Apis.instance()
        .db_api()
        .exec("get_witness_by_account", [account_id])
        .then((optional_witness_object) => {
          if (optional_witness_object) {
            this._subTo("witnesses", optional_witness_object.id);
            this.witness_by_account_id.set(
              optional_witness_object.witness_account,
              optional_witness_object.id
            );
            let witness_object = this._updateObject(
              optional_witness_object,
              true
            );
            resolve(witness_object);
          } else {
            this.witness_by_account_id.set(account_id, null);
            this.notifySubscribers();
            resolve(null);
          }
        }, reject);
    });
  }

  fetchCommitteeMemberByAccount(account_id) {
    return new Promise((resolve, reject) => {
      Apis.instance()
        .db_api()
        .exec("get_committee_member_by_account", [account_id])
        .then((optional_committee_object) => {
          if (optional_committee_object) {
            this._subTo("committee", optional_committee_object.id);
            this.committee_by_account_id.set(
              optional_committee_object.committee_member_account,
              optional_committee_object.id
            );
            let committee_object = this._updateObject(
              optional_committee_object,
              true
            );
            resolve(committee_object);
          } else {
            this.committee_by_account_id.set(account_id, null);
            this.notifySubscribers();
            resolve(null);
          }
        }, reject);
    });
  }

  fetchFullAccount(name_or_id, autosubscribe = null) {
    if (autosubscribe == null) {
      autosubscribe = default_auto_subscribe;
    }

    let fetch_account = false;
    const subChanged =
      this.get_full_accounts_subscriptions.has(name_or_id) &&
      this.get_full_accounts_subscriptions.get(name_or_id) === false &&
      autosubscribe;

    const is_object_id = ChainValidation.is_object_id(name_or_id);
    const is_account_name =
      !is_object_id && ChainValidation.is_account_name(name_or_id, true);

    if (is_object_id && !subChanged) {
      let current = this.objects_by_id.get(name_or_id);
      fetch_account = current === undefined;
      if (
        !fetch_account &&
        current &&
        current.name &&
        current.balances
      )
        return current;
    } else if (!subChanged) {
      if (!is_account_name)
        throw Error("argument is not an account name: " + name_or_id);

      let account_id = this.accounts_by_name.get(name_or_id);
      if (ChainValidation.is_object_id(account_id))
        return this.getAccount(account_id, autosubscribe);
    }

    if (
      subChanged ||
      !this.fetching_get_full_accounts.has(name_or_id) ||
      Date.now() - this.fetching_get_full_accounts.get(name_or_id) > 5000
    ) {
      this.fetching_get_full_accounts.set(name_or_id, Date.now());
      Apis.instance()
        .db_api()
        .exec("get_full_accounts", [[name_or_id], autosubscribe])
        .then((results) => {
          if (results.length === 0) {
            if (is_object_id) {
              this.objects_by_id.set(name_or_id, null);
              this.notifySubscribers();
            } else if (is_account_name) {
              this.accounts_by_name.set(name_or_id, null);
              this.notifySubscribers();
            }
            return;
          }
          let full_account = results[0][1];
          this.get_full_accounts_subscriptions.set(
            full_account.account.name,
            autosubscribe
          );
          this.get_full_accounts_subscriptions.set(
            full_account.account.id,
            autosubscribe
          );

          this._subTo("accounts", full_account.account.id);
          let {
            account,
            assets,
            vesting_balances,
            statistics,
            call_orders,
            settle_orders,
            more_data_available,
            limit_orders,
            referrer_name,
            registrar_name,
            lifetime_referrer_name,
            votes,
            proposals,
            htlcs_from,
            htlcs_to,
          } = full_account;

          if (!htlcs_from) htlcs_from = [];
          if (!htlcs_to) htlcs_to = [];
          if (!settle_orders) settle_orders = [];
          if (!more_data_available) more_data_available = [];

          this.accounts_by_name.set(account.name, account.id);
          account.assets = assets || [];
          account.referrer_name = referrer_name;
          account.lifetime_referrer_name = lifetime_referrer_name;
          account.registrar_name = registrar_name;
          account.more_data_available = more_data_available;
          account.orders = new Set();
          account.vesting_balances = new Set();
          account.balances = {};
          account.call_orders = new Set();
          account.settle_orders = new Set();
          account.proposals = new Set();
          account.htlcs_to = new Set();
          account.htlcs_from = new Set();

          vesting_balances.forEach((vb) => {
            this._updateObject(vb);
            account.vesting_balances.add(vb.id);
          });

          votes.forEach((v) => this._updateObject(v));

          (full_account.balances || []).forEach((b) => {
            this._updateObject(b);
            account.balances[b.asset_type] = b.id;
          });
          (limit_orders || []).forEach((order) => {
            this._updateObject(order);
            account.orders.add(order.id);
          });
          (call_orders || []).forEach((co) => {
            this._updateObject(co);
            account.call_orders.add(co.id);
          });
          (settle_orders || []).forEach((so) => {
            this._updateObject(so);
            account.settle_orders.add(so.id);
          });
          (htlcs_to || []).forEach((htlc) => {
            this._updateObject(htlc);
            account.htlcs_to.add(htlc.id);
          });
          (htlcs_from || []).forEach((htlc) => {
            this._updateObject(htlc);
            account.htlcs_from.add(htlc.id);
          });
          (proposals || []).forEach((p) => {
            this._updateObject(p);
            account.proposals.add(p.id);
          });

          this._updateObject(statistics);
          this._updateObject(account);
          this.notifySubscribers();
        })
        .catch((error) => {
          if (
            error &&
            error.message === "Assert Exception: account: no such account"
          ) {
            if (is_object_id) {
              this.objects_by_id.set(name_or_id, null);
              this.notifySubscribers();
            } else if (is_account_name) {
              this.accounts_by_name.set(name_or_id, null);
              this.notifySubscribers();
            }
          } else {
            if (is_object_id) this.objects_by_id.delete(name_or_id);
            else this.accounts_by_name.delete(name_or_id);
          }
        });
    }
    return undefined;
  }

  getAccountMemberStatus(account) {
    if (account === undefined) return undefined;
    if (account === null) return "unknown";
    if (account.lifetime_referrer == account.id) return "lifetime";
    let exp = new Date(account.membership_expiration_date).getTime();
    let now = new Date().getTime();
    if (exp < now) return "basic";
    return "annual";
  }

  getAccountBalance(account, asset_type) {
    let balances = account.balances;
    if (!balances) return 0;

    let balance_obj_id = balances[asset_type];
    if (balance_obj_id) {
      let bal_obj = this.objects_by_id.get(balance_obj_id);
      if (bal_obj) return bal_obj.balance;
    }
    return 0;
  }

  /**
   * Updates the object in place by deep-merging the set properties of object.
   *
   * @pre object.id must be a valid object ID.
   */
  _updateObject(object, notify_subscribers = false, emit = true) {
    if (!("id" in object)) {
      if (
        "balance" in object &&
        "owner" in object &&
        "settlement_date" in object
      ) {
        emitterInstance.emit("settle-order-update", object);
      }
      return;
    }

    const objectType = getObjectType(object.id);

    switch (objectType) {
      case "transaction":
      case "operation_history":
      case "block_summary":
        return;

      case "account_transaction_history":
      case "limit_order":
      case "call_order":
      case "account_balance":
      case "account_stats":
        if (
          !this._isSubbedTo(
            "accounts",
            object.account ||
              object.seller ||
              object.borrower ||
              object.owner
          )
        ) {
          return;
        }
        break;

      case "witness":
        if (!this._isSubbedTo("witnesses", object.id)) {
          return;
        }
        break;

      case "committee_member":
        if (!this._isSubbedTo("committee", object.id)) {
          return;
        }
        break;

      case "unknown":
      case "market":
        return;

      default:
    }

    if (object.id == "2.1.0") {
      const recent_slots_filled = BigInt(object.recent_slots_filled);
      object.participation =
        100 * (bitCount(recent_slots_filled) / 128.0);
      this.head_block_time_string = object.time;
      this.chain_time_offset.push(
        Date.now() - timeStringToDate(object.time).getTime()
      );
      if (this.chain_time_offset.length > 10)
        this.chain_time_offset.shift();
    }

    let current = this.objects_by_id.get(object.id);
    if (!current) current = undefined;

    if (current === undefined || current === true) {
      current = Object.assign({}, object);
      this.objects_by_id.set(object.id, current);
    } else {
      switch (objectType) {
        case "account":
          current = mergeDeep(current, object);
          this.objects_by_id.set(object.id, current);
          break;
        case "asset":
        case "asset_bitasset_data":
          current = Object.assign({}, current, object);
          this.objects_by_id.set(object.id, current);
          break;
        case "witness":
        case "committee_member":
        case "worker":
          current = Object.assign({}, current, object);
          this.objects_by_id.set(object.id, current);
          break;
        default:
          // Reference replaces (no deep merge) for all other types.
          current = Object.assign({}, object);
          this.objects_by_id.set(object.id, current);
      }
    }

    /* Special handling for various objects (Immutable special-casing ported
     * to plain objects / Maps / Sets). */
    switch (objectType) {
      case "account_balance": {
        let owner = this.objects_by_id.get(object.owner);
        if (owner === undefined || owner === null || owner === true) {
          break;
        }
        if (!owner.balances) owner = Object.assign({}, owner, { balances: {} });
        owner = Object.assign({}, owner, {
          balances: Object.assign({}, owner.balances, {
            [object.asset_type]: object.id,
          }),
        });
        this.objects_by_id.set(object.owner, owner);
        break;
      }

      case "witness":
        if (this._isSubbedTo("witnesses", object.id)) {
          this.witness_by_account_id.set(
            object.witness_account,
            object.id
          );
          if (object.vote_id !== undefined)
            this.objects_by_vote_id.set(object.vote_id, object.id);
        } else {
          break;
        }
        break;

      case "committee_member":
        if (this._isSubbedTo("committee", object.id)) {
          this.committee_by_account_id.set(
            object.committee_member_account,
            object.id
          );
          if (object.vote_id !== undefined)
            this.objects_by_vote_id.set(object.vote_id, object.id);
        } else {
          break;
        }
        break;

      case "worker":
        if (object.vote_for !== undefined)
          this.objects_by_vote_id.set(object.vote_for, object.id);
        if (object.vote_against !== undefined)
          this.objects_by_vote_id.set(object.vote_against, object.id);
        if (!this.workers.has(object.id)) this.workers.add(object.id);
        break;

      case "account": {
        current = Object.assign({}, current, {
          active: object.active,
          owner: object.owner,
          options: object.options,
          whitelisting_accounts: object.whitelisting_accounts,
          blacklisting_accounts: object.blacklisting_accounts,
          whitelisted_accounts: object.whitelisted_accounts,
          blacklisted_accounts: object.blacklisted_accounts,
        });
        this.objects_by_id.set(object.id, current);
        this.accounts_by_name.set(object.name, object.id);
        break;
      }

      case "asset": {
        this.assets_by_symbol.set(object.symbol, object.id);
        // make sure we fetch the bitasset data object
        let bitasset = current.bitasset;
        if (!bitasset && "bitasset_data_id" in object) {
          let bad = this.getObject(object.bitasset_data_id, true);
          if (!bad) bad = {};
          if (!bad.asset_id) bad = Object.assign({}, bad, { asset_id: object.id });
          this.objects_by_id.set(object.bitasset_data_id, bad);
          current = Object.assign({}, current, { bitasset: bad });
          this.objects_by_id.set(object.id, current);
        }
        break;
      }

      case "asset_bitasset_data": {
        let asset_id = current.asset_id;
        if (asset_id) {
          let asset = this.getObject(asset_id);
          if (asset) {
            asset = Object.assign({}, asset, { bitasset: current });
            emitterInstance.emit("bitasset-update", asset);
            this.objects_by_id.set(asset_id, asset);
          }
        }
        break;
      }

      case "call_order":
        if (emit) {
          emitterInstance.emit("call-order-update", object);
        }
        {
          let call_account = this.objects_by_id.get(object.borrower);
          if (call_account && call_account !== true) {
            if (!call_account.call_orders)
              call_account = Object.assign({}, call_account, {
                call_orders: new Set(),
              });
            let call_orders = new Set(call_account.call_orders);
            if (!call_orders.has(object.id)) {
              call_orders.add(object.id);
              call_account = Object.assign({}, call_account, {
                call_orders,
              });
              this.objects_by_id.set(call_account.id, call_account);
              Apis.instance()
                .db_api()
                .exec("get_objects", [[object.id]]); // force subscription
            }
          }
        }
        break;

      case "limit_order": {
        let limit_account = this.objects_by_id.get(object.seller);
        if (limit_account && limit_account !== true) {
          if (!limit_account.orders)
            limit_account = Object.assign({}, limit_account, {
              orders: new Set(),
            });
          let limit_orders = new Set(limit_account.orders);
          if (!limit_orders.has(object.id)) {
            limit_orders.add(object.id);
            limit_account = Object.assign({}, limit_account, {
              orders: limit_orders,
            });
            this.objects_by_id.set(limit_account.id, limit_account);
            Apis.instance()
              .db_api()
              .exec("get_objects", [[object.id]]); // force subscription
          }
        }
        break;
      }

      case "proposal":
        notify_subscribers =
          notify_subscribers || this.addProposalData(
            object.required_active_approvals,
            object.id
          );
        notify_subscribers =
          notify_subscribers ||
          this.addProposalData(object.required_owner_approvals, object.id);
        break;

      default:
    }

    if (notify_subscribers) this.notifySubscribers();
    return current;
  }

  getObjectByVoteID(vote_id) {
    let obj_id = this.objects_by_vote_id.get(vote_id);
    if (obj_id) return this.getObject(obj_id);
    return undefined;
  }

  getHeadBlockDate() {
    return timeStringToDate(this.head_block_time_string);
  }

  getEstimatedChainTimeOffset() {
    if (this.chain_time_offset.length === 0) return 0;
    const sorted = this.chain_time_offset.slice().sort((a, b) => a - b);
    return sorted[Math.floor((sorted.length - 1) / 2)];
  }

  addProposalData(approvals, objectId) {
    let didImpact = false;
    (approvals || []).forEach((id) => {
      let impactedAccount = this.objects_by_id.get(id);
      if (impactedAccount && impactedAccount !== true) {
        didImpact = true;
        if (!impactedAccount.proposals)
          impactedAccount = Object.assign({}, impactedAccount, {
            proposals: new Set(),
          });
        let proposals = new Set(impactedAccount.proposals);
        if (!proposals.has(objectId)) {
          proposals.add(objectId);
          impactedAccount = Object.assign({}, impactedAccount, {
            proposals,
          });
          this.objects_by_id.set(impactedAccount.id, impactedAccount);
        }
      }
    });
    return didImpact;
  }

  getLiquidityPoolsByAssets(
    assetType = "asset_a",
    assetA,
    assetB,
    limit = 101,
    startId
  ) {
    const ASSET_TYPE = ["asset_a", "asset_b", "both"];
    if (ASSET_TYPE.indexOf(assetType) === -1) {
      throw Error("asset type is unexpected");
    }
    const METHOD_NAME = {
      asset_a: "get_liquidity_pools_by_asset_a",
      asset_b: "get_liquidity_pools_by_asset_b",
      both: "get_liquidity_pools_by_both_assets",
    };
    const methodName = METHOD_NAME[assetType];

    let params = [];
    switch (assetType) {
      case "asset_a":
        params = [assetA, limit, startId];
        break;
      case "asset_b":
        params = [assetB, limit, startId];
        break;
      case "both":
        params = [assetA, assetB, limit, startId];
        break;
    }

    return Apis.instance()
      .db_api()
      .exec(methodName, params)
      .then((result) => {
        if (result.length > 0) {
          const tmp = [];
          result.forEach((pool) => {
            pool.asset_a = this.getAsset(pool.asset_a);
            pool.asset_b = this.getAsset(pool.asset_b);
            pool.share_asset = this.getAsset(pool.share_asset);
            pool.dynamic_share_asset = this.getObject(
              pool.share_asset.dynamic_asset_data_id
            );
            tmp.push(pool);
          });
          return tmp;
        }
        return [];
      })
      .catch((error) => {
        console.error("get_liquidity_pools_by_assets error:", error);
      });
  }

  getLiquidityPoolsByShareAsset(assets, subscribe = false) {
    return Apis.instance()
      .db_api()
      .exec("get_liquidity_pools_by_share_asset", [assets, subscribe])
      .then((result) => {
        if (result.length > 0) {
          const tmp = [];
          result.forEach((pool) => {
            pool.asset_a = this.getAsset(pool.asset_a);
            pool.asset_b = this.getAsset(pool.asset_b);
            pool.share_asset = this.getAsset(pool.share_asset);
            pool.dynamic_share_asset = this.getObject(
              pool.share_asset.dynamic_asset_data_id
            );
            tmp.push(pool);
          });
          return tmp;
        }
        return [];
      })
      .catch((error) => {
        console.error("get_liquidity_pools_by_share_asset error:", error);
      });
  }
}

let chain_store = new ChainStore();

function FetchChainObjects(method, object_ids, timeout, subMap) {
  let get_object = method.bind(chain_store);

  return new Promise((resolve, reject) => {
    let timeout_handle = null;

    function onUpdate(not_subscribed_yet = false) {
      let res = object_ids.map((id) => {
        if (method.name === "getAccount") return get_object(id, subMap[id]);
        if (method.name === "getObject")
          return get_object(id, false, subMap[id]);
        return get_object(id);
      });
      if (res.findIndex((o) => o === undefined) === -1) {
        if (timeout_handle) clearTimeout(timeout_handle);
        if (!not_subscribed_yet) chain_store.unsubscribe(onUpdate);
        resolve(res);
        return true;
      }
      return false;
    }

    let resolved = onUpdate(true);
    if (!resolved) chain_store.subscribe(onUpdate);

    if (timeout && !resolved)
      timeout_handle = setTimeout(() => {
        chain_store.unsubscribe(onUpdate);
        reject(
          `${method.name} request timed out after ${timeout}ms with object ids: ${JSON.stringify(
            object_ids
          )}`
        );
      }, timeout);
  });
}
chain_store.FetchChainObjects = FetchChainObjects;

function FetchChain(methodName, objectIds, timeout = 3000, subMap = {}) {
  let method = chain_store[methodName];
  if (!method) throw new Error("ChainStore does not have method " + methodName);

  let arrayIn = Array.isArray(objectIds);
  if (!arrayIn) objectIds = [objectIds];

  return chain_store
    .FetchChainObjects(method, objectIds, timeout, subMap)
    .then((res) => (arrayIn ? res : res[0]));
}

chain_store.FetchChain = FetchChain;

// Count of set bits in a BigInt (BigInteger.bitCount replacement).
function bitCount(n) {
  let count = 0;
  let v = n;
  while (v > 0n) {
    if (v & 1n) count++;
    v >>= 1n;
  }
  return count;
}

export default chain_store;
