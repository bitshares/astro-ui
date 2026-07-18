import { persistentMap } from "@nanostores/persistent";

type StoredBlocklist = {
  users: string[];
  timestamp: number;
};

type UserBlock = {
  name: string;
  id: string;
};

type StoredUserBlocklist = {
  bitshares: UserBlock[];
  bitshares_testnet: UserBlock[];
};

const $blockList = persistentMap<StoredBlocklist>(
  "blocklist",
  {
    users: [],
    timestamp: Date.now(),
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
        return { users: [], timestamp: 0 };
      }
    },
  }
);

const $userBlockList = persistentMap<StoredUserBlocklist>(
  "userBlocklist",
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
        return { bitshares: [], bitshares_testnet: [] };
      }
    },
  }
);

function addBlockedUser(chain: string, user: UserBlock) {
  const users = $userBlockList.get()[chain];
  if (users.find((u) => u.id === user.id)) {
    return;
  }
  $userBlockList.set({ ...$userBlockList.get(), [chain]: [...users, user] });
}

function removeBlockedUser(chain: string, user: UserBlock) {
  const users = $userBlockList.get()[chain];
  const index = users.findIndex((u) => u.id === user.id);
  if (index === -1) {
    return;
  }
  $userBlockList.set({ ...$userBlockList.get(), [chain]: users.toSpliced(index, 1) });
}

function updateBlockList(users: string[]) {
  console.log("Updating blocklist");
  $blockList.setKey("users", users);
  $blockList.setKey("timestamp", Date.now());
}

export {
  $blockList,
  $userBlockList,
  addBlockedUser,
  removeBlockedUser,
  updateBlockList,
};
