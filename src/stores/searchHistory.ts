import { persistentMap } from "@nanostores/persistent";

type SearchHistoryEntry = {
  name: string;
  id: string;
  lastUsed: number;
};

type StoredSearchHistory = {
  bitshares: SearchHistoryEntry[];
  bitshares_testnet: SearchHistoryEntry[];
};

const MAX_HISTORY = 100;

const $searchHistory = persistentMap<StoredSearchHistory>(
  "searchHistory",
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

function addSearchHistory(chain: string, entry: SearchHistoryEntry) {
  const current = $searchHistory.get()[chain] ?? [];
  const existingIndex = current.findIndex((e) => e.id === entry.id);

  if (existingIndex !== -1) {
    current.splice(existingIndex, 1);
  }

  current.push({ ...entry, lastUsed: Date.now() });

  if (current.length > MAX_HISTORY) {
    current.sort((a, b) => a.lastUsed - b.lastUsed);
    while (current.length > MAX_HISTORY) {
      current.shift();
    }
  }

  $searchHistory.set({ ...$searchHistory.get(), [chain]: current });
}

function clearSearchHistory(chain: string) {
  $searchHistory.set({ ...$searchHistory.get(), [chain]: [] });
}

export { $searchHistory, addSearchHistory, clearSearchHistory };
export type { SearchHistoryEntry };
