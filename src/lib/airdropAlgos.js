// Minimal vector math (replaces the reference's three.js dependency)
class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  toArray() {
    return [this.x, this.y, this.z];
  }
  distanceSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }
  distanceToSquared(o) {
    const dx = this.x - o.x;
    const dy = this.y - o.y;
    const dz = this.z - o.z;
    return dx * dx + dy * dy + dz * dz;
  }
}

class Line3 {
  constructor(a, b) {
    this.a = a;
    this.b = b;
  }
  distanceSq() {
    return this.a.distanceToSquared(this.b);
  }
  at(t, target) {
    target.x = this.a.x + (this.b.x - this.a.x) * t;
    target.y = this.a.y + (this.b.y - this.a.y) * t;
    target.z = this.a.z + (this.b.z - this.a.z) * t;
    return target;
  }
}

// Keep only digits, but swap letters for their char code so the string
// stays numeric (mirrors the reference's deterministic seed shaping).
function isCharNumber(c) {
  return c >= "0" && c <= "9";
}

function filterParseInt(parseTarget) {
  const vals = parseTarget.split("");
  let finalValue;
  for (let i = 0; i < vals.length; i++) {
    if (parseInt(vals[i], 10) > 0) {
      finalValue = parseTarget.substring(i, vals.length);
      break;
    }
  }
  return !finalValue ? 0 : parseInt(finalValue, 10);
}

function chunk(arr, chunkSize) {
  if (chunkSize <= 0 || chunkSize > arr.length) {
    throw new Error("Invalid chunk size");
  }
  const refArr = arr.toLocaleString("fullwide", { useGrouping: false });
  const producedChunks = [];
  for (let i = 0; i < refArr.length; i += chunkSize) {
    producedChunks.push(refArr.slice(i, i + chunkSize));
  }
  return producedChunks.filter((x) => x.length === chunkSize);
}

function extractTickets(quantity, targetLine, increment) {
  const chosenTickets = [];
  for (let i = 1; i <= quantity; i++) {
    const resultPlaceholder = new Vector3(0, 0, 0);
    const calculated = targetLine.at(increment * i, resultPlaceholder);
    const computed = calculated.toArray();
    const ticketValue = computed[2] * 1000000 + computed[1] * 1000 + computed[0];
    chosenTickets.push(parseInt(ticketValue, 10));
  }
  return chosenTickets;
}

// ---- signature-derived (lottery) algorithms ----
function forward(chunks) {
  return chunks.map((x) => filterParseInt(x));
}

function reverse(chunks) {
  return chunks.map((x) => filterParseInt(x.split("").reverse().join("")));
}

function reverse_pi(chunks) {
  const piChunks = [];
  const reversedChunks = chunks.map((x) =>
    filterParseInt(x.split("").reverse().join("")),
  );
  for (let i = 0; i < reversedChunks.length; i++) {
    const current = parseInt(Math.sqrt(reversedChunks[i]), 10);
    for (let y = i; y < reversedChunks.length - i; y++) {
      const nextValue = parseInt(Math.sqrt(reversedChunks[y]), 10);
      piChunks.push(parseInt(current * nextValue * Math.PI, 10));
    }
  }
  return piChunks;
}

function forward_pi(chunks) {
  const piChunks = [];
  for (let i = 0; i < chunks.length; i++) {
    const current = parseInt(Math.sqrt(filterParseInt(chunks[i])), 10);
    for (let y = i; y < chunks.length - i; y++) {
      const nextValue = parseInt(Math.sqrt(filterParseInt(chunks[y])), 10);
      piChunks.push(parseInt(current * nextValue * Math.PI, 10));
    }
  }
  return piChunks;
}

function cubed(filtered_signature) {
  const smallerChunks = chunk(filtered_signature, 3).map((x) =>
    filterParseInt(x),
  );
  return smallerChunks.map((x) => parseInt(x * x * x, 10));
}

function avg_point_lines(chunks, maxDistance) {
  const vectorChunks = chunks.map((initialChunk) => chunk(initialChunk, 3));
  let xTally = 0;
  let yTally = 0;
  let zTally = 0;
  for (let i = 0; i < vectorChunks.length; i++) {
    const current = vectorChunks[i];
    xTally += filterParseInt(current[0]);
    yTally += filterParseInt(current[1]);
    zTally += filterParseInt(current[2]);
  }
  const avgVector = new Vector3(
    parseInt(xTally / vectorChunks.length, 10),
    parseInt(yTally / vectorChunks.length, 10),
    parseInt(zTally / vectorChunks.length, 10),
  );
  const avg_lines = vectorChunks.map((vector) => {
    const current = new Vector3(
      filterParseInt(vector[0]),
      filterParseInt(vector[1]),
      filterParseInt(vector[2]),
    );
    return new Line3(current, avgVector);
  });
  let chosenTickets = [];
  for (let i = 0; i < avg_lines.length; i++) {
    const currentLine = avg_lines[i];
    const qty = parseInt((currentLine.distanceSq() / maxDistance) * 999, 10);
    const currentChosenTickets = extractTickets(qty, currentLine, 0.001);
    chosenTickets = [...chosenTickets, ...currentChosenTickets];
  }
  return chosenTickets;
}

function alien_blood(filtered_signature) {
  const initHullChunks = chunk(filtered_signature, 6);
  let corrasionTickets = [];
  for (let i = 0; i < initHullChunks.length; i++) {
    const currentHullChunk = initHullChunks[i];
    const hullFragments = chunk(currentHullChunk, 3);
    const splatX = filterParseInt(hullFragments[0]);
    const splatY = filterParseInt(hullFragments[1]);
    const splatterPoint = new Vector3(splatX, splatY, 0);
    const coolingZone = new Vector3(splatX, splatY, 999);
    const corrasion = new Line3(splatterPoint, coolingZone);
    const currentChosenTickets = extractTickets(999, corrasion, 0.001);
    corrasionTickets = [...corrasionTickets, ...currentChosenTickets];
  }
  return corrasionTickets;
}

function bouncing_ball(initialChunks, maxDistance) {
  const vectors = initialChunks.map((nineDigits) => {
    const vectorChunks = chunk(nineDigits, 3);
    return new Vector3(
      filterParseInt(vectorChunks[0]),
      filterParseInt(vectorChunks[1]),
      filterParseInt(vectorChunks[2]),
    );
  });
  const bouncingVectors = [];
  for (let i = 0; i < vectors.length; i++) {
    const currentVector = vectors[i];
    const cvArray = currentVector.toArray();
    const nextVector = vectors[i + 1];
    if (!nextVector) continue;
    const nvArray = nextVector.toArray();
    if (nvArray[2] <= cvArray[2]) {
      const xAxis = (parseInt(nvArray[0], 10) + parseInt(cvArray[0], 10)) / 2;
      const yAxis = (parseInt(nvArray[1], 10) + parseInt(cvArray[1], 10)) / 2;
      bouncingVectors.push(new Vector3(xAxis, yAxis, 0));
    }
    bouncingVectors.push(nextVector);
  }
  const lastVector = bouncingVectors.slice(-1)[0].toArray();
  lastVector[2] = 0;
  const finalVector = new Vector3(lastVector[0], lastVector[1], lastVector[2]);
  bouncingVectors.push(finalVector);
  const pathOfBall = [];
  for (let i = 0; i < bouncingVectors.length - 1; i++) {
    const currentVector = bouncingVectors[i];
    const nextVector = bouncingVectors[i + 1];
    const distance = currentVector.distanceToSquared(nextVector);
    pathOfBall.push({
      line: new Line3(currentVector, nextVector),
      distance,
      qtyPicks: distance > 0 ? parseInt((distance / maxDistance) * 999, 10) : 0,
    });
  }
  let chosenTickets = [];
  for (let i = 0; i < pathOfBall.length; i++) {
    const currentLine = pathOfBall[i];
    const currentChosenTickets = extractTickets(
      currentLine.qtyPicks,
      currentLine.line,
      0.001,
    );
    chosenTickets = [...chosenTickets, ...currentChosenTickets];
  }
  return chosenTickets;
}

function barrel_of_fish(initialChunks, maxDistance, projectile, splinter) {
  const pointOfImpact = chunk(initialChunks[0], 3);
  const poiVector = new Vector3(
    filterParseInt(pointOfImpact[0]),
    filterParseInt(pointOfImpact[1]),
    filterParseInt(pointOfImpact[2]),
  );
  const endVectors =
    splinter === "yes" ? initialChunks.slice(1) : [initialChunks.slice(1)[0]];
  const projectileDepth = projectile === "beam" ? 999 : 333;
  let obliteratedFish = [];
  for (let y = 0; y < endVectors.length; y++) {
    const end = chunk(endVectors[y], 3);
    const endPoint = new Vector3(
      filterParseInt(end[0]),
      filterParseInt(end[1]),
      filterParseInt(end[2]),
    );
    const path = new Line3(poiVector, endPoint);
    const fishInWay = parseInt((path.distanceSq() / maxDistance) * projectileDepth, 10);
    const currentChosenTickets = extractTickets(fishInWay, path, 0.001);
    obliteratedFish = [...obliteratedFish, ...currentChosenTickets];
  }
  return obliteratedFish;
}

// ---- filter algorithms (operate on the loaded candidate pool) ----
function freebie(leaderboardJSON) {
  return leaderboardJSON.map((user) => user.range.from);
}

function getTickets(algoType, filtered_signature, leaderboardJSON, opts = {}) {
  const LOTTERY = [
    "forward",
    "reverse",
    "pi",
    "reverse_pi",
    "cubed",
    "avg_point_lines",
    "alien_blood",
    "bouncing_ball",
    "barrel_of_fish",
  ];
  const isLottery = LOTTERY.includes(algoType);
  if (isLottery && (!filtered_signature || filtered_signature.length < 9)) {
    return [];
  }
  const initialChunks = isLottery ? chunk(filtered_signature, 9) : [];
  const minVector = new Vector3(0, 0, 0);
  const maxVector = new Vector3(999, 999, 999);
  const maxDistance = minVector.distanceToSquared(maxVector);
  switch (algoType) {
    case "forward":
      return forward(initialChunks);
    case "reverse":
      return reverse(initialChunks);
    case "pi":
      return forward_pi(initialChunks);
    case "reverse_pi":
      return reverse_pi(initialChunks);
    case "cubed":
      return cubed(filtered_signature);
    case "avg_point_lines":
      return avg_point_lines(initialChunks, maxDistance);
    case "alien_blood":
      return alien_blood(filtered_signature);
    case "bouncing_ball":
      return bouncing_ball(initialChunks, maxDistance);
    case "barrel_of_fish":
      return barrel_of_fish(
        initialChunks,
        maxDistance,
        opts.bof_projectile,
        opts.bof_splinter,
      );
    case "freebie":
      return freebie(leaderboardJSON);
    default:
      return [];
  }
}

// Shape a block witness_signature into a numeric seed string
function filterSignature(witnessSignature) {
  return witnessSignature
    .split("")
    .map((char) => (isCharNumber(char) ? char : char.charCodeAt(0).toString()))
    .join("");
}

function executeCalculation(
  filtered_signature,
  distributions,
  deduplicate,
  alwaysWinning,
  leaderboardJSON,
  opts = {},
) {
  const generatedNumbers = {};
  let winningTickets = [];
  const winners = {};

  for (let i = 0; i < distributions.length; i++) {
    const algoType = distributions[i];
    let algoTickets = getTickets(
      algoType,
      filtered_signature,
      leaderboardJSON,
      opts,
    );

    if (deduplicate === "Yes") {
      algoTickets = [...new Set(algoTickets)];
      algoTickets = algoTickets.filter((item) => !winningTickets.includes(item));
    }

    if (alwaysWinning === "Yes" && leaderboardJSON.length) {
      const lastTicketVal = leaderboardJSON[leaderboardJSON.length - 1].range.to;
      algoTickets = algoTickets.map((num) => {
        if (num <= lastTicketVal) return num;
        const adjustedNum = num - Math.floor(num / lastTicketVal) * lastTicketVal;
        return adjustedNum;
      });
    }

    winningTickets = winningTickets.concat(algoTickets);
    generatedNumbers[algoType] = algoTickets;
  }

  for (const [key, value] of Object.entries(generatedNumbers)) {
    const algo = key;
    const ticketNumbers = value;

    for (let i = 0; i < ticketNumbers.length; i++) {
      const currentNumber = ticketNumbers[i];
      const foundUser = leaderboardJSON.find(
        (x) => currentNumber >= x.range.from && currentNumber <= x.range.to,
      );

      if (foundUser) {
        const ticketValue = 1;

        const winningTicket = { ticket: currentNumber, algo, value: ticketValue };
        winners[foundUser.id] = Object.prototype.hasOwnProperty.call(
          winners,
          foundUser.id,
        )
          ? [...winners[foundUser.id], winningTicket]
          : [winningTicket];
      }
    }
  }

  const summary = [];
  for (const [key, value] of Object.entries(winners)) {
    const currentPercent = (
      (value.length / winningTickets.length) *
      100
    ).toFixed(5);
    summary.push({
      id: key,
      name: leaderboardJSON.find((x) => x.id === key)?.name,
      tickets: value.sort((a, b) => a.ticket - b.ticket),
      qty: value.length,
      ticketsValue: value.reduce((a, b) => a + b.value, 0),
      percent: currentPercent,
    });
  }

  return { summary, generatedNumbers };
}

export {
  executeCalculation,
  filterSignature,
  getTickets,
  runAllAccountsLottery,
  freebie,
  forward,
  reverse,
  forward_pi,
  reverse_pi,
  cubed,
  avg_point_lines,
  alien_blood,
  bouncing_ball,
  barrel_of_fish,
};

/**
 * Lottery over the entire account space (1.2.1 .. 1.2.maxAccountId). Used when
 * the candidate pool is "all accounts" — we never enumerate millions of entries;
 * instead each drawn signature number maps directly to an account id.
 *
 * @param {string[]} algoTypes lottery algorithm keys
 * @param {string} filtered_signature numeric seed string
 * @param {number} maxAccountId highest existing account id
 * @returns {Array<{id:string,name:undefined,qty:number,ticketsValue:number,percent:string}>}
 */
function runAllAccountsLottery(algoTypes, filtered_signature, maxAccountId) {
  const winners = {};
  for (const algoType of algoTypes) {
    const nums = getTickets(algoType, filtered_signature, [], {});
    for (const n of nums) {
      if (!Number.isFinite(n)) continue;
      let accountNum = ((n % maxAccountId) + maxAccountId) % maxAccountId;
      if (accountNum === 0) accountNum = maxAccountId;
      const id = `1.2.${accountNum}`;
      winners[id] = (winners[id] || 0) + 1;
    }
  }
  return Object.entries(winners).map(([id, hits]) => ({
    id,
    name: undefined,
    qty: hits,
    ticketsValue: hits,
    percent: "0",
  }));
}
