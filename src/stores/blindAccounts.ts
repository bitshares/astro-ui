import { persistentMap } from "@nanostores/persistent";

export type StoredBlindAccount = {
  label: string;
  chain: string;
  publicKey: string;
  encryptedWif: string;
  encryptedBrainKey: string | null;
};

type StoredBlindAccounts = {
  bitshares: StoredBlindAccount[];
  bitshares_testnet: StoredBlindAccount[];
};

const $blindAccounts = persistentMap<StoredBlindAccounts>(
  "blindAccounts:",
  {
    bitshares: [],
    bitshares_testnet: [],
  },
  {
    encode(value) {
      return JSON.stringify(value);
    },
    decode(value) {
      try {
        return JSON.parse(value);
      } catch (e) {
        console.log(e);
        return value;
      }
    },
  }
);

function getAccounts(chain: string): StoredBlindAccount[] {
  const store = $blindAccounts.get();
  return (store[chain] || []) as StoredBlindAccount[];
}

function addAccount(chain: string, account: StoredBlindAccount) {
  const store = $blindAccounts.get();
  const list = store[chain] || [];
  if (list.some((a) => a.label === account.label)) {
    throw new Error(`A blind account labeled "${account.label}" already exists`);
  }
  if (list.some((a) => a.publicKey === account.publicKey)) {
    throw new Error("This blind account public key is already stored");
  }
  $blindAccounts.setKey(chain, [...list, account]);
}

function removeAccount(chain: string, label: string) {
  const store = $blindAccounts.get();
  const list = store[chain] || [];
  $blindAccounts.setKey(
    chain,
    list.filter((a) => a.label !== label)
  );
}

function findByLabel(
  chain: string,
  label: string
): StoredBlindAccount | undefined {
  return getAccounts(chain).find((a) => a.label === label);
}

function findByPublicKey(
  chain: string,
  publicKey: string
): StoredBlindAccount | undefined {
  return getAccounts(chain).find((a) => a.publicKey === publicKey);
}

export {
  $blindAccounts,
  getAccounts,
  addAccount,
  removeAccount,
  findByLabel,
  findByPublicKey,
};
