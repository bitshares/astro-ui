import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";
import { getObjects } from "./src/common";
import { esSearch } from "./src/esquery";

// ─────────────────────────────────────────────────────────────
// Helpers (one-shot, no subscriptions)
// ─────────────────────────────────────────────────────────────

async function fetchAccountFull(chain: string, searchName: string, specificNode?: string | null) {
  const trimmed = searchName.trim();
  const isId = /^1\.2\.\d+$/.test(trimmed);
  const node = specificNode ? specificNode : (chains as any)[chain].nodeList[0].url;

  let currentAPI: any;
  try {
    currentAPI = await Apis.instance(
      node,
      true,
      4000,
      { enableDatabase: true },
      (error: Error) => console.log({ error })
    );
  } catch (error) {
    console.log({ error });
    throw error;
  }

  let account: any = null;
  let accountId: string = trimmed;

  if (isId) {
    // Direct ID lookup — mirrors blocksights search.html "Account name or ID"
    try {
      const objs = await getObjects(chain, [trimmed], specificNode, currentAPI);
      if (objs && objs.length && objs[0]?.id) account = objs[0];
    } catch (e) {
      console.log(e);
    }
    // Also try get_accounts with the id as account_id string for full shape fallback
    if (!account) {
      try {
        const accs = await currentAPI.db_api().exec("get_accounts", [[trimmed]]);
        if (accs && accs.length && accs[0]) account = accs[0];
      } catch {}
    }
    if (!account) {
      try {
        currentAPI.close();
      } catch {}
      throw new Error("Account not found (ID)");
    }
    accountId = account.id;
  } else {
    let accounts: any;
    try {
      accounts = await currentAPI.db_api().exec("get_accounts", [[trimmed]]);
    } catch (error) {
      console.log({ error });
      try {
        currentAPI.close();
      } catch {}
      throw error;
    }

    if (!accounts || !accounts.length || !accounts[0]) {
      try {
        currentAPI.close();
      } catch {}
      throw new Error("Account not found");
    }

    account = accounts[0];
    accountId = account.id as string;
  }

  // Fetch full account details (balances, etc) and raw get_objects for same id
  let fullAccount: any = null;
  let objectData: any = null;
  try {
    const results = await currentAPI.db_api().exec("get_full_accounts", [[accountId], false]);
    if (results && results.length) fullAccount = results[0];
  } catch (error) {
    console.log({ error });
  }

  try {
    const objs = await getObjects(chain, [accountId], specificNode, currentAPI);
    if (objs && objs.length) objectData = objs[0];
  } catch (error) {
    console.log({ error });
  }

  try {
    currentAPI.close();
  } catch {}

  return { account, fullAccount, objectData, accountId };
}

async function fetchAssetFull(chain: string, symbol: string, specificNode?: string | null) {
  const trimmed = symbol.trim();
  const isId = /^1\.3\.\d+$/.test(trimmed);
  const node = specificNode ? specificNode : (chains as any)[chain].nodeList[0].url;

  let currentAPI: any;
  try {
    currentAPI = await Apis.instance(
      node,
      true,
      4000,
      { enableDatabase: true },
      (error: Error) => console.log({ error })
    );
  } catch (error) {
    console.log({ error });
    throw error;
  }

  let assetID: string | null = null;
  if (isId) {
    // Direct ID — mirrors blocksights "Asset name or ID"
    assetID = trimmed;
  } else {
    try {
      assetID = await currentAPI.db_api().exec("get_asset_id_from_string", [trimmed.toUpperCase()]);
    } catch (error) {
      console.log({ error });
    }

    if (!assetID) {
      try {
        currentAPI.close();
      } catch {}
      throw new Error("Asset not found");
    }
  }

  let assetData: any[] = [];
  try {
    assetData = await getObjects(chain, [assetID], null, currentAPI);
  } catch (error) {
    console.log({ error });
  }

  const asset = assetData && assetData.length ? assetData[0] : null;
  if (!asset) {
    try {
      currentAPI.close();
    } catch {}
    throw new Error("Asset data not found");
  }

  const objectIDs: string[] = [asset.id.replace("1.3.", "2.3.")];
  if (asset.bitasset_data_id) objectIDs.push(asset.bitasset_data_id);

  let extra: any[] = [];
  try {
    extra = await getObjects(chain, objectIDs, null, currentAPI);
  } catch (error) {
    console.log({ error });
  }

  try {
    currentAPI.close();
  } catch {}

  return { asset, assetID, dynamicAssetData: extra[0] || null, bitassetData: extra[1] || null };
}

async function fetchObjectById(chain: string, objectId: string, specificNode?: string | null) {
  const objs = await getObjects(chain, [objectId], specificNode);
  if (!objs || !objs.length || !objs[0]) {
    throw new Error("Object not found (null/expired)");
  }
  return objs[0];
}

async function fetchBlockByNumber(chain: string, blockNum: number, specificNode?: string | null) {
  const node = specificNode ? specificNode : (chains as any)[chain].nodeList[0].url;

  let currentAPI: any;
  try {
    currentAPI = await Apis.instance(
      node,
      true,
      4000,
      { enableDatabase: true },
      (error: Error) => console.log({ error })
    );
  } catch (error) {
    console.log({ error });
    throw error;
  }

  let block: any = null;
  let header: any = null;
  try {
    block = await currentAPI.db_api().exec("get_block", [blockNum]);
  } catch (error) {
    console.log({ error });
  }

  try {
    header = await currentAPI.db_api().exec("get_block_header", [blockNum]);
  } catch (error) {
    // not all nodes expose header, ignore
  }

  try {
    currentAPI.close();
  } catch {}

  if (!block) {
    throw new Error("Block not found (beyond head or pruned)");
  }

  return { block, header, blockNumber: blockNum };
}

async function fetchTransactionByHash(chain: string, hash: string, _specificNode?: string | null) {
  const trimmed = hash.trim().toLowerCase();
  if (!/^[a-f0-9]{40}$|^[a-f0-9]{64}$/.test(trimmed)) {
    throw new Error("Invalid transaction hash format (expected 40 or 64 hex chars)");
  }

  let lastError: any = null;

  // 1) Primary: es.bitshares.dev
  const queries = [
    { index: "bitshares-*", body: { query: { term: { "trx_id.keyword": trimmed } }, size: 5 } },
    { index: "bitshares-*", body: { query: { term: { trx_id: trimmed } }, size: 5 } },
    { index: "bitshares-*", body: { query: { match: { trx_id: trimmed } }, size: 5 } },
  ];
  for (const q of queries) {
    try {
      const resp = await esSearch(q.index, q.body);
      const hits = resp?.hits?.hits;
      if (hits && hits.length) {
        return { hash: trimmed, hits, raw: hits.length === 1 ? hits[0] : hits };
      }
    } catch (e) {
      lastError = e;
      continue;
    }
  }

  // 2) Fallback: WS history_api
  if (chain === "bitshares" || chain === "bitshares_testnet") {
    const node = _specificNode ? _specificNode : (chains as any)[chain].nodeList[0].url;
    let currentAPI: any;
    try {
      currentAPI = await Apis.instance(
        node,
        true,
        4000,
        { enableDatabase: true },
        (error: Error) => console.log({ error })
      );
    } catch (e) {
      if (lastError) throw lastError;
      throw e;
    }
    try {
      const tx = await currentAPI.history_api().exec("get_recent_transaction_by_id", [trimmed]);
      try {
        currentAPI.close();
      } catch {}
      if (tx && (tx.trx || tx.id || tx.block_num)) {
        return { hash: trimmed, transaction: tx };
      }
    } catch (e) {
      try {
        currentAPI.close();
      } catch {}
      lastError = e;
    }
  }

  if (lastError) throw lastError;
  throw new Error("Transaction not found (ES and WS fallback both empty)");
}

// ─────────────────────────────────────────────────────────────
// nanoquery stores (thin wrappers)
// ─────────────────────────────────────────────────────────────

const [createExplorerAccountStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const name = args[1] as string;
    const specificNode = args[2] ? (args[2] as string) : null;
    try {
      return await fetchAccountFull(chain, name, specificNode);
    } catch (e) {
      console.log(e);
      throw e;
    }
  },
});

const [createExplorerAssetStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const symbol = args[1] as string;
    const specificNode = args[2] ? (args[2] as string) : null;
    try {
      return await fetchAssetFull(chain, symbol, specificNode);
    } catch (e) {
      console.log(e);
      throw e;
    }
  },
});

const [createExplorerObjectStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const objectId = args[1] as string;
    const specificNode = args[2] ? (args[2] as string) : null;
    try {
      return await fetchObjectById(chain, objectId, specificNode);
    } catch (e) {
      console.log(e);
      throw e;
    }
  },
});

const [createExplorerBlockStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const blockNum = args[1] as number;
    const specificNode = args[2] ? (args[2] as string) : null;
    try {
      return await fetchBlockByNumber(chain, blockNum, specificNode);
    } catch (e) {
      console.log(e);
      throw e;
    }
  },
});

const [createExplorerTxStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const hash = args[1] as string;
    const specificNode = args[2] ? (args[2] as string) : null;
    try {
      return await fetchTransactionByHash(chain, hash, specificNode);
    } catch (e) {
      console.log(e);
      throw e;
    }
  },
});

export {
  fetchAccountFull,
  fetchAssetFull,
  fetchObjectById,
  fetchBlockByNumber,
  fetchTransactionByHash,
  createExplorerAccountStore,
  createExplorerAssetStore,
  createExplorerObjectStore,
  createExplorerBlockStore,
  createExplorerTxStore,
};
