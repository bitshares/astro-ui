import Apis from "../bts/ws/ApiInstances";
import TransactionBuilder from "../bts/chain/TransactionBuilder";
import { v4 as uuidv4 } from "uuid";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { utf8ToBytes, randomBytes } from "@noble/ciphers/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";

const chains = {
  bitshares: {
    nodeList: [
      {
        url: "wss://node.xbts.io/ws",
      },
      {
        url: "wss://api.bitshares.dev/ws",
      },
      {
        url: "wss://btsws.roelandp.nl/ws",
      },
    ],
  },
  bitshares_testnet: {
    nodeList: [
      {
        url: "wss://testnet.dex.trading/",
      },
      {
        url: "wss://testnet.xbts.io/ws",
      },
      {
        url: "wss://api-testnet.61bts.com/ws",
      },
    ],
  },
};

const VERSION_BYTE = 0x01;
const NONCE_LENGTH = 24;

function encryptForBeetVault(plaintext, totpCode) {
  const key = sha256(utf8ToBytes(totpCode));
  const nonce = randomBytes(NONCE_LENGTH);
  const ciphertext = xchacha20poly1305(key, nonce).encrypt(
    utf8ToBytes(plaintext)
  );
  const packed = new Uint8Array(1 + NONCE_LENGTH + ciphertext.length);
  packed[0] = VERSION_BYTE;
  packed.set(nonce, 1);
  packed.set(ciphertext, 1 + NONCE_LENGTH);
  key.fill(0);
  return Buffer.from(packed).toString("base64");
}

async function generateTotpDeepLink(chain, nodeURL, opTypes, operations, totpCode) {
  return new Promise(async (resolve, reject) => {
    if (!totpCode || typeof totpCode !== "string" || !totpCode.trim().length) {
      return reject(new Error("TOTP code is required"));
    }
    const _node =
      nodeURL && nodeURL.length ? nodeURL : chains[chain].nodeList[0].url;

    try {
      await Apis.instance(
        _node,
        true,
        4000,
        { enableCrypto: false, enableOrders: true },
        (error) => console.log({ error }),
      ).init_promise;
    } catch (error) {
      console.log({ error, location: "api instance failed (TOTP)" });
      return reject(error);
    }

    let includesMemos = false;
    const tr = new TransactionBuilder();
    for (let i = 0; i < operations.length; i++) {
      const opCopy = { ...operations[i] };
      if (opCopy.memo && typeof opCopy.memo.message === "string") {
        try {
          opCopy.memo.message = Buffer.from(opCopy.memo.message, "utf-8");
        } catch (error) {
          console.log({ error, location: "encode memo failed (TOTP)" });
          return reject(error);
        }
        includesMemos = true;
        // keep mutated copy for the builder; also update original reference
        // to stay consistent with generateDeepLink side-effects
        operations[i].memo.message = opCopy.memo.message;
      }
      const payload = opCopy.memo ? opCopy : operations[i];
      tr.add_type_operation(opTypes[i], payload);
    }

    try {
      await tr.update_head_block();
    } catch (error) {
      console.log({ error, location: "update head block failed (TOTP)" });
      reject(error);
      return;
    }

    try {
      await tr.set_required_fees();
    } catch (error) {
      console.log({ error, location: "set required fees failed (TOTP)" });
      reject(error);
      return;
    }

    try {
      tr.set_expire_seconds(7200);
    } catch (error) {
      console.log({ error, location: "set expire seconds failed (TOTP)" });
      reject(error);
      return;
    }

    try {
      tr.finalize();
    } catch (error) {
      console.log({ error, location: "finalize failed (TOTP)" });
      reject(error);
      return;
    }

    let id;
    try {
      id = await uuidv4();
    } catch (error) {
      console.log({ error, location: "uuid generation failed (TOTP)" });
      reject(error);
      return;
    }

    const request = {
      type: "api",
      id: id,
      payload: {
        method: "injectedCall",
        params: ["signAndBroadcast", JSON.stringify(tr.toObject()), []],
        appName: "Bitshares Astro UI",
        chain: chain === "bitshares" ? "BTS" : "BTS_TEST",
        browser: "web browser",
        origin: "localhost",
        memo: includesMemos,
      },
    };

    let wire;
    try {
      const encrypted = encryptForBeetVault(
        JSON.stringify(request),
        totpCode.trim()
      );
      wire = Buffer.from(encrypted, "utf-8").toString("base64");
    } catch (error) {
      console.log({ error, location: "encrypt TOTP payload failed" });
      return reject(error);
    }

    const chainId = chain === "bitshares" ? "BTS" : "BTS_TEST";
    const deeplink = `beetvault://api/?chain=${chainId}&request=${encodeURIComponent(wire)}`;
    resolve(deeplink);
  });
}

async function generateDeepLink(chain, nodeURL, opTypes, operations) {
  return new Promise(async (resolve, reject) => {
    const _node =
      nodeURL && nodeURL.length ? nodeURL : chains[chain].nodeList[0].url;

    try {
      await Apis.instance(
        _node,
        true,
        4000,
        { enableCrypto: false, enableOrders: true },
        (error) => console.log({ error }),
      ).init_promise;
    } catch (error) {
      console.log({ error, location: "api instance failed" });
      return reject(error);
    }

    let includesMemos = false;
    const tr = new TransactionBuilder();
    for (let i = 0; i < operations.length; i++) {
      // Convert the memo message to bytes
      if (operations[i].memo && operations[i].memo.message) {
        let encodedMessage;
        try {
          encodedMessage = Buffer.from(operations[i].memo.message, "utf-8");
        } catch (error) {
          console.log({ error, location: "encode memo failed" });
          return reject(error);
        }
        includesMemos = true;
        operations[i].memo.message = encodedMessage;
      }
      tr.add_type_operation(opTypes[i], operations[i]);
    }

    try {
      await tr.update_head_block();
    } catch (error) {
      console.log({ error, location: "update head block failed" });
      reject(error);
      return;
    }

    try {
      await tr.set_required_fees();
    } catch (error) {
      console.log({ error, location: "set required fees failed" });
      reject(error);
      return;
    }

    try {
      tr.set_expire_seconds(7200);
    } catch (error) {
      console.log({ error, location: "set expire seconds failed" });
      reject(error);
      return;
    }

    try {
      tr.finalize();
    } catch (error) {
      console.log({ error, location: "finalize failed" });
      reject(error);
      return;
    }

    let id;
    try {
      id = await uuidv4();
    } catch (error) {
      console.log({ error, location: "uuid generation failed" });
      reject(error);
      return;
    }

    const request = {
      type: "api",
      id: id,
      payload: {
        method: "injectedCall",
        params: ["signAndBroadcast", JSON.stringify(tr.toObject()), []],
        appName: "Bitshares Astro UI",
        chain: chain === "bitshares" ? "BTS" : "BTS_TEST",
        browser: "web browser",
        origin: "localhost",
        memo: includesMemos,
      },
    };

    let encodedPayload;
    try {
      encodedPayload = encodeURIComponent(JSON.stringify(request));
    } catch (error) {
      console.log({ error, location: "encode payload failed" });
      reject(error);
      return;
    }

    resolve(encodedPayload);
  });
}

export { generateDeepLink, generateTotpDeepLink, encryptForBeetVault };
