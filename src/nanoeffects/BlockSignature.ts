import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

async function getBlockSignature(
  chain: string,
  blockNumber: number | string,
  specificNode?: string | null,
) {
  return new Promise((resolve, reject) => {
    const node = specificNode
      ? specificNode
      : (chains as any)[chain].nodeList[0].url;

    let currentAPI;
    Apis.instance(node, true, 4000, { enableDatabase: true }, (error: Error) =>
      console.log({ error }),
    )
      .then((api: any) => {
        currentAPI = api;
        return api
          .db_api()
          .exec("get_block", [parseInt(blockNumber as string, 10)]);
      })
      .then((block: any) => {
        currentAPI.close();
        if (!block || !block.witness_signature) {
          reject(new Error("Block signature not found"));
          return;
        }
        resolve(block.witness_signature);
      })
      .catch((error: Error) => {
        if (currentAPI) currentAPI.close();
        console.log({ error });
        reject(error);
      });
  });
}

const [createBlockSignatureStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const blockNumber = args[1] as number;
    let specificNode = args[2] ? (args[2] as string) : null;

    try {
      return await getBlockSignature(chain, blockNumber, specificNode);
    } catch (error) {
      console.log({ error });
      return;
    }
  },
});

export { createBlockSignatureStore, getBlockSignature };
