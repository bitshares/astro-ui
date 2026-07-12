import { persistentMap } from "@nanostores/persistent";

export type Recipient = {
  account: string;
  humanAmount?: number;
  satoshis?: number;
};

export type AirdropPlan = {
  id: string;
  name: string;
  createdAt: number;
  chain: string;
  assetSymbol: string;
  assetId: string;
  precision: number;
  distributionMode: "custom" | "equal" | "fixed";
  totalAmount?: number;
  fixedAmount?: number;
  recipients: Recipient[];
  batchSize: number;
  batches: number;
  status: "draft" | "ready" | "in_progress" | "completed";
  broadcastBatches: number[];
};

const $airdropPlans = persistentMap<AirdropPlan>(
  "airdropPlans:",
  {},
  {
    encode: (value) => JSON.stringify(value),
    decode: (value) => {
      try {
        return JSON.parse(value);
      } catch (e) {
        return {};
      }
    },
  }
);

function addAirdropPlan(plan: AirdropPlan) {
  const all = $airdropPlans.get();
  $airdropPlans.set({ ...all, [plan.id]: plan });
}

function updateAirdropPlan(id: string, patch: Partial<AirdropPlan>) {
  const all = $airdropPlans.get();
  if (!all[id]) return;
  $airdropPlans.set({ ...all, [id]: { ...all[id], ...patch } });
}

function getAirdropPlan(id: string): AirdropPlan | undefined {
  return $airdropPlans.get()[id];
}

function removeAirdropPlan(id: string) {
  const all = $airdropPlans.get();
  if (!all[id]) return;
  const { [id]: _removed, ...rest } = all;
  $airdropPlans.set(rest);
}

function allAirdropPlans(): AirdropPlan[] {
  const all = $airdropPlans.get();
  return Object.values(all).sort((a, b) => b.createdAt - a.createdAt);
}

export {
  $airdropPlans,
  addAirdropPlan,
  updateAirdropPlan,
  getAirdropPlan,
  removeAirdropPlan,
  allAirdropPlans,
};
