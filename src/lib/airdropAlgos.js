/**
 * Deterministic lottery algorithms for the airdrop calculator.
 *
 * Each algorithm takes a numeric seed string derived from a block's
 * `witness_signature` (via {@link filterSignature}) and deterministically
 * produces a set of "winning ticket numbers." Those ticket numbers are then
 * matched against a weighted {@link https://en.wikipedia.org/wiki/Line_interpolation|leaderboard}
 * where each account owns a contiguous numeric range proportional to its
 * weight (balance, ticket lock, collateral, etc.).
 *
 * The algorithms fall into two categories:
 *   **Lottery algorithms** — generate tickets from the seed signature alone.
 *   **Filter algorithms** — operate on the already-built candidate pool.
 *
 * The geometric (3-D vector) lottery algorithms sample a fixed number of
 * points evenly along a line and take the ticket count for that line to be
 * **proportional to its linear (Euclidean) length** (`√distanceSq`). This
 * keeps the ticket density per unit of geometric length uniform across all
 * lines, so short lines still contribute (rather than dropping to zero as a
 * squared-distance weighting would do).
 *
 * The main entry point is {@link executeCalculation}, which orchestrates a
 * full run across one or more algorithms and maps the results back to
 * leaderboard accounts.
 */

// ---------------------------------------------------------------------------
// Minimal vector math (replaces the reference app's three.js dependency)
// ---------------------------------------------------------------------------

/**
 * Minimal 3D vector used by the geometric lottery algorithms.
 * Carries only the subset of three.js `Vector3` functionality needed for
 * line parameterisation and distance calculations.
 */
class Vector3 {
  /**
   * @param {number} [x=0] X component
   * @param {number} [y=0] Y component
   * @param {number} [z=0] Z component
   */
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * Return the vector as a plain `[x, y, z]` array.
   * @returns {[number, number, number]}
   */
  toArray() {
    return [this.x, this.y, this.z];
  }

  /**
   * Squared distance from the origin (0,0,0).
   * Used as a normalisation bound for distance-based ticket extraction.
   * @returns {number}
   */
  distanceSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  /**
   * Squared Euclidean distance to another vector.
   * @param {Vector3} o
   * @returns {number}
   */
  distanceToSquared(o) {
    const dx = this.x - o.x;
    const dy = this.y - o.y;
    const dz = this.z - o.z;
    return dx * dx + dy * dy + dz * dz;
  }
}

/**
 * A line segment between two {@link Vector3} points.
 * Supports linear interpolation (`at`) and squared-length measurement.
 */
class Line3 {
  /**
   * @param {Vector3} a Start point
   * @param {Vector3} b End point
   */
  constructor(a, b) {
    this.a = a;
    this.b = b;
  }

  /**
   * Squared length of the segment (distance from `a` to `b`).
   * @returns {number}
   */
  distanceSq() {
    return this.a.distanceToSquared(this.b);
  }

  /**
   * Linearly interpolate along the segment at parameter `t`.
   *   t = 0 → point `a`,  t = 1 → point `b`.
   * The result is written into `target` (mutated in place for performance).
   *
   * @param {number} t  Interpolation parameter in [0, 1].
   * @param {Vector3} target  Pre-allocated vector to write the result into.
   * @returns {Vector3} The same `target` reference, now filled with the
   *   interpolated position.
   */
  at(t, target) {
    target.x = this.a.x + (this.b.x - this.a.x) * t;
    target.y = this.a.y + (this.b.y - this.a.y) * t;
    target.z = this.a.z + (this.b.z - this.a.z) * t;
    return target;
  }
}

// ---------------------------------------------------------------------------
// Seed-shaping helpers
// ---------------------------------------------------------------------------

/**
 * Returns `true` when `c` is a character in the range `'0'`–`'9'`.
 * Used by {@link filterSignature} to decide whether a character can be
 * kept as-is or must be replaced by its char code.
 *
 * @param {string} c  Single character to test.
 * @returns {boolean}
 */
function isCharNumber(c) {
  return c >= "0" && c <= "9";
}

/**
 * Strip leading non-numeric characters from `parseTarget` and return the
 * remaining integer value.
 *
 * Scans left-to-right for the first digit > 0, takes the substring from
 * that position to the end, and parses it with `parseInt(base 10)`.
 * Returns `0` if no valid integer is found.
 *
 * @param {string} parseTarget  String that may be prefixed with
 *   non-numeric characters (e.g. a chunk of a signature).
 * @returns {number}  Parsed integer, or `0`.
 */
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

/**
 * Split an array (or string) into equal-length chunks.
 *
 * The input is first converted to a full-width string representation via
 * `toLocaleString("fullwide", { useGrouping: false })` so that the
 * character expansion is deterministic across locales.  Only *complete*
 * chunks (length === `chunkSize`) are returned — any trailing partial
 * chunk is silently dropped.
 *
 * @param {string|Array} arr         Input to chunk.
 * @param {number}       chunkSize   Desired length of each chunk.
 *   Must be > 0 and ≤ `arr.length`.
 * @returns {string[]}  Array of string chunks.
 * @throws {Error} If `chunkSize` is invalid (≤ 0 or > input length).
 */
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

/**
 * Sample `quantity` evenly-spaced ticket numbers along a {@link Line3}.
 *
 * The line is sampled at `t = increment * i` for `i = 1 … quantity`
 * (i.e. starting just past the `a` endpoint).  At each sample point the
 * 3-D coordinates are collapsed into a single integer:
 *
 *     ticket = z × 1 000 000  +  y × 1 000  +  x
 *
 * This maps the 3-D parametric position onto a 1-D ticket number that
 * can be matched against the leaderboard ranges.
 *
 * @param {number}  quantity   Number of tickets to extract.
 * @param {Line3}   targetLine The line segment to sample.
 * @param {number}  increment  Step size in `t`-space between samples
 *   (e.g. 0.001 = 1 000 equally spaced samples over the full line).
 * @returns {number[]}  Array of integer ticket numbers.
 */
function extractTickets(quantity, targetLine, increment) {
  const chosenTickets = [];
  for (let i = 1; i <= quantity; i++) {
    const resultPlaceholder = new Vector3(0, 0, 0);
    const calculated = targetLine.at(increment * i, resultPlaceholder);
    const computed = calculated.toArray();
    const ticketValue = computed[2] * 1000000 + computed[1] * 1000 + computed[0];
    chosenTickets.push(Math.trunc(ticketValue));
  }
  return chosenTickets;
}

// ---------------------------------------------------------------------------
// Signature-derived (lottery) algorithms
//
// Each takes an array of 9-digit string chunks (produced by `chunk(seed, 9)`
// in `getTickets`) and returns an array of integer ticket numbers.
// ---------------------------------------------------------------------------

/**
 * Forward lottery — the simplest algorithm.
 *
 * Each 9-digit chunk is parsed directly as an integer.  The raw signature
 * digits become the ticket numbers with no transformation.
 *
 * @param {string[]} chunks  Array of 9-digit numeric strings.
 * @returns {number[]}  Parsed integer tickets.
 */
function forward(chunks) {
  return chunks.map((x) => filterParseInt(x));
}

/**
 * Reverse lottery — digit-mirrors each chunk before parsing.
 *
 * Each 9-digit chunk is reversed (`"123456789"` → `"987654321"`) and then
 * parsed.  Ensures the lottery outcome changes even for small signature
 * differences that only affect one end of the string.
 *
 * @param {string[]} chunks  Array of 9-digit numeric strings.
 * @returns {number[]}  Parsed integer tickets from reversed chunks.
 */
function reverse(chunks) {
  return chunks.map((x) => filterParseInt(x.split("").reverse().join("")));
}

/**
 * Reverse-π lottery — reversed chunks with π-based non-linear mixing.
 *
 * Steps:
 *   1. Reverse and parse every chunk.
 *   2. For each chunk `i`, combine it (via a π product) with every later
 *      chunk `y` in the range `i ≤ y < length/2`:
 *        `floor(√reversed[i]  ×  √reversed[y]  ×  π)`
 *   3. Collect all pair-products as tickets.
 *
 * The multiplication by π spreads the values across a much wider numeric
 * range than the raw digits.
 *
 * NOTE: the inner loop bound (`y < length - y`, i.e. `y < length/2`) means
 * only the lower half of the upper-triangle of pairs is generated — the
 * pair set is intentionally truncated relative to a full `y ≥ i` sweep, and
 * is asymmetric with {@link forward_pi}.  This matches the original
 * reference behaviour; change the bound to `y < reversedChunks.length` to
 * enumerate every `y ≥ i` pair.
 *
 * @param {string[]} chunks  Array of 9-digit numeric strings.
 * @returns {number[]}  π-mixed integer tickets.
 */
function reverse_pi(chunks) {
  const piChunks = [];
  const reversedChunks = chunks.map((x) =>
    filterParseInt(x.split("").reverse().join("")),
  );
  for (let i = 0; i < reversedChunks.length; i++) {
    const current = parseInt(Math.sqrt(reversedChunks[i]), 10);
    for (let y = i; y < reversedChunks.length - y; y++) {
      const nextValue = parseInt(Math.sqrt(reversedChunks[y]), 10);
      piChunks.push(parseInt(current * nextValue * Math.PI, 10));
    }
  }
  return piChunks;
}

/**
 * Forward-π lottery — like {@link reverse_pi} but without the initial
 * digit reversal.
 *
 * Each chunk is parsed forward, then for each chunk `i` it is combined
 * (via a π product) with every later chunk `y` in the range
 * `i ≤ y < length - i`:
 *     `floor(√parsed[i]  ×  √parsed[y]  ×  π)`
 *
 * The pair-wise structure ensures dense ticket coverage; the forward
 * (non-reversed) parsing means the signature's natural digit order
 * directly influences the outcome.
 *
 * NOTE: the inner loop bound (`y < length - i`) truncates the upper
 * triangle — only pairs with `y < length - i` are generated, so the pair
 * set shrinks as `i` grows.  This matches the original reference
 * behaviour; change the bound to `y < chunks.length` to enumerate every
 * `y ≥ i` pair.
 *
 * @param {string[]} chunks  Array of 9-digit numeric strings.
 * @returns {number[]}  π-mixed integer tickets (forward order).
 */
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

/**
 * Cubed lottery — amplifies small signature differences via cubic scaling.
 *
 * The signature is split into 3-digit groups, each parsed as an integer
 * and then cubed (`x³`).  Because cubing is a fast-growing function,
 * even a single-digit change in the input produces a vastly different
 * ticket number, spreading draws across the full numeric range.
 *
 * @param {string} filtered_signature  The full numeric seed string.
 * @returns {number[]}  Cubed integer tickets.
 */
function cubed(filtered_signature) {
  const smallerChunks = chunk(filtered_signature, 3).map((x) =>
    filterParseInt(x),
  );
  return smallerChunks.map((x) => parseInt(x * x * x, 10));
}

/**
 * Average-point-lines lottery — distance-weighted ticket extraction from
 * lines connecting each vector to the centroid.
 *
 * Algorithm:
 *   1. Split the signature into 9-digit chunks, then each chunk into three
 *      3-digit (x, y, z) groups → one vector per chunk.
 *   2. Compute the centroid (arithmetic mean) of all vectors.
 *   3. For each vector, draw a line to the centroid.
 *   4. The number of tickets on that line is:
 *        `floor((lineLength / maxDistance) × 999)`
 *      where `lineLength` is the **linear** (Euclidean) distance between the
 *      vector and the centroid, and `maxDistance` is the maximum possible
 *      such length (corner-to-corner of the `[0,999]³` cube).  Using the
 *      linear length (rather than its square) keeps the ticket density per
 *      unit of geometric length uniform, so short lines still contribute.
 *   5. Sample the line at 0.001 increments to produce the tickets.
 *
 * Accounts (vectors) farther from the centroid receive proportionally
 * more tickets.
 *
 * @param {string[]} chunks      Array of 9-digit numeric strings.
 * @param {number}   maxDistance  Maximum linear (Euclidean) distance between
 *   two points in the `[0,999]³` cube, used as the normalisation bound for
 *   ticket counts.
 * @returns {number[]}  Extracted integer tickets.
 */
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
    const qty = parseInt((Math.sqrt(currentLine.distanceSq()) / maxDistance) * 999, 10);
    const currentChosenTickets = extractTickets(qty, currentLine, 0.001);
    chosenTickets = [...chosenTickets, ...currentChosenTickets];
  }
  return chosenTickets;
}

/**
 * "Alien blood" lottery — vertical-line ticket extraction.
 *
 * The signature is split into 6-digit groups; each group is further split
 * into two 3-digit halves forming an (x, y) coordinate.  A vertical line
 * is constructed from `(x, y, 0)` to `(x, y, 999)` and exactly 999 tickets
 * are sampled along it at 0.001 increments.
 *
 * The name comes from the vertical "dripping" visual pattern the tickets
 * create when plotted in 3-D space.  Every chunk produces the same number
 * of tickets (999) but at different numeric positions, making the
 * distribution dependent on the x/y values in the signature.
 *
 * @param {string} filtered_signature  The full numeric seed string.
 * @returns {number[]}  Extracted integer tickets.
 */
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

/**
 * "Bouncing ball" lottery — simulates a ball path between signature vectors.
 *
 * Algorithm:
 *   1. Convert each 9-digit chunk into a 3-D vector (3-digit x/y/z groups).
 *   2. Walk the vectors in order, tracing a path.  When the next vector's
 *      z-component is ≤ the current one (the ball "hits a surface"), insert
 *      a bounce point at the average x/y with z = 0 before continuing.
 *   3. Build line segments between consecutive (bounce) points.
 *   4. Tickets per segment = `floor(segmentLength / maxDistance × 999)`,
 *      where `segmentLength` is the **linear** (Euclidean) distance along the
 *      segment.  Using the linear length (rather than its square) keeps the
 *      ticket density per unit of geometric length uniform.
 *   5. Sample each segment at 0.001 increments to produce tickets.
 *
 * The bouncing behaviour creates clusters of tickets near "impact" zones
 * while spreading thinner draws along longer flights.
 *
 * @param {string[]} chunks      Array of 9-digit numeric strings.
 * @param {number}   maxDistance  Maximum linear (Euclidean) distance between
 *   two points in the `[0,999]³` cube, used as the normalisation bound for
 *   ticket counts.
 * @returns {number[]}  Extracted integer tickets.
 */
function bouncing_ball(initialChunks, maxDistance) {
  // A path needs at least two signature vectors.  A single chunk cannot form
  // one, and leaving `bouncingVectors` empty would crash when the final
  // vector is resolved below.
  if (!initialChunks || initialChunks.length < 2) return [];

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
      qtyPicks: distance > 0 ? parseInt((Math.sqrt(distance) / maxDistance) * 999, 10) : 0,
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

/**
 * "Barrel of fish" lottery — origin-to-endpoint line sampling.
 *
 * The most configurable algorithm.  The first chunk is treated as the
 * "point of impact" (origin); subsequent chunks define endpoint vectors.
 * Lines are drawn from the origin to each endpoint and tickets are
 * sampled along them.
 *
 * Parameters:
 *   - `projectile`: `"beam"` → full-depth sampling (999 tickets per unit
 *     distance), anything else → shallow sampling (333 tickets).
 *   - `splinter`: `"yes"` → use *all* remaining chunks as separate
 *     endpoints (multiple lines from the same origin); anything else →
 *     use only the *first* remaining chunk (single line).
 *
 * The metaphor is firing at a barrel of fish from a fixed point: the
 * origin stays constant while the endpoints determine where the "shots"
 * land.  The number of tickets per line is proportional to its **linear**
 * (Euclidean) length (not its square), keeping ticket density per unit
 * length uniform.
 *
 * @param {string[]} initialChunks  Array of 9-digit numeric strings.
 *   `initialChunks[0]` is the origin; the rest are endpoints.
 * @param {number}   maxDistance     Maximum linear (Euclidean) distance between
 *   two points in the `[0,999]³` cube — normalisation bound for ticket counts.
 * @param {string}   projectile     `"beam"` for full-depth, other for
 *   shallow sampling.
 * @param {string}   splinter       `"yes"` to use all endpoint chunks,
 *   other to use only the first.
 * @returns {number[]}  Extracted integer tickets.
 */
function barrel_of_fish(initialChunks, maxDistance, projectile, splinter) {
  const pointOfImpact = chunk(initialChunks[0], 3);
  const poiVector = new Vector3(
    filterParseInt(pointOfImpact[0]),
    filterParseInt(pointOfImpact[1]),
    filterParseInt(pointOfImpact[2]),
  );
  const nextChunks = initialChunks.slice(1);
  const endVectors =
    splinter === "yes" ? nextChunks : nextChunks.length ? [nextChunks[0]] : [];
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
    const fishInWay = parseInt((Math.sqrt(path.distanceSq()) / maxDistance) * projectileDepth, 10);
    const currentChosenTickets = extractTickets(fishInWay, path, 0.001);
    obliteratedFish = [...obliteratedFish, ...currentChosenTickets];
  }
  return obliteratedFish;
}

// ---------------------------------------------------------------------------
// Additional geometric / numeric lottery algorithms
// ---------------------------------------------------------------------------

/**
 * Fibonacci-lattice ("golden") lottery — uniform point distribution.
 *
 * Generates `N` points using a 3-D Korobov lattice built from the golden
 * ratio, which has provably **low discrepancy** (near-uniform density in
 * every sub-region of the `[0,999]³` cube).  Each point is collapsed to a
 * ticket via the standard `z·1e6 + y·1e3 + x` encoding.
 *
 *   x = (i·φ)   mod 1
 *   y = (i·φ²)  mod 1
 *   z = (i·φ³)  mod 1
 *
 * where φ = (1 + √5) / 2.  Because φ, φ², φ³ are irrational and
 * multiplicatively independent, the three coordinates never align into a
 * regular grid — the points fill the cube evenly with no clustering and no
 * gaps.  This makes it the fairest purely-geometric option: every account
 * range is approximately equally likely to be hit, independent of where it
 * sits in the cube.
 *
 * @param {string} filtered_signature  The full numeric seed string.
 * @returns {number[]}  Array of integer tickets (one per lattice point).
 */
function golden(filtered_signature) {
  const chunks = chunk(filtered_signature, 9);
  // Number of lattice points — scales with the signature length but is
  // capped so very long signatures don't explode the ticket count.
  const n = Math.min(chunks.length * 100, 5000);
  const phi = (1 + Math.sqrt(5)) / 2;
  const phi2 = phi * phi;
  const phi3 = phi * phi * phi;
  const tickets = [];
  for (let i = 1; i <= n; i++) {
    const x = (i * phi) % 1;
    const y = (i * phi2) % 1;
    const z = (i * phi3) % 1;
    const xi = Math.floor(x * 1000);
    const yi = Math.floor(y * 1000);
    const zi = Math.floor(z * 1000);
    tickets.push(zi * 1000000 + yi * 1000 + xi);
  }
  return tickets;
}

/**
 * Deterministic "walk" lottery — a meandering path through the cube.
 *
 * Starting from a point derived from the first signature chunk, the walk
 * takes one step per remaining chunk.  Each step's **direction** comes from
 * the chunk's three 3-digit groups (a 3-D vector) and its **length** varies
 * with those same digits, so the path is fully determined by the signature.
 * Points are clamped to the `[0,999]³` cube (reflecting off the walls), and
 * tickets are sampled along every segment using {@link extractTickets} with
 * the **linear** (Euclidean) distance convention — so ticket density per
 * unit of path length stays uniform.
 *
 * Unlike {@link bouncing_ball} (which jumps between full vectors and only
 * inserts points on descent), the walk makes many small, locally-varying
 * steps, so it wanders through the volume and covers regions the straight
 * line-based algos leave empty.
 *
 * @param {string[]} initialChunks  Array of 9-digit numeric strings.
 * @param {number}   maxDistance  Maximum linear (Euclidean) distance between
 *   two points in the `[0,999]³` cube, used as the normalisation bound for
 *   ticket counts.
 * @returns {number[]}  Extracted integer tickets.
 */
function walk(initialChunks, maxDistance) {
  // A path needs at least two signature vectors (a start point + one step).
  if (!initialChunks || initialChunks.length < 2) return [];

  const parts = initialChunks.map((c) => chunk(c, 3));

  // Start point from the first chunk's three 3-digit groups.
  const start = parts[0];
  let current = new Vector3(
    filterParseInt(start[0]),
    filterParseInt(start[1]),
    filterParseInt(start[2]),
  );

  const maxStep = 60; // cap on a single step's length (≈ 6% of the cube)
  const chosenTickets = [];

  for (let i = 1; i < parts.length; i++) {
    const dx = filterParseInt(parts[i][0]);
    const dy = filterParseInt(parts[i][1]);
    const dz = filterParseInt(parts[i][2]);

    // Vary the step length (5..65 units) from the same digits so steps differ.
    const magRaw = (dx + dy + dz) % 1000;
    const mag = 5 + (magRaw / 999) * maxStep;

    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const step = new Vector3(
      (dx / len) * mag,
      (dy / len) * mag,
      (dz / len) * mag,
    );

    const next = new Vector3(
      current.x + step.x,
      current.y + step.y,
      current.z + step.z,
    );
    // Reflect off the cube walls so the walk stays inside [0,999]³.
    next.x = Math.max(0, Math.min(999, next.x));
    next.y = Math.max(0, Math.min(999, next.y));
    next.z = Math.max(0, Math.min(999, next.z));

    const line = new Line3(current, next);
    const dist = current.distanceToSquared(next);
    const qty = dist > 0 ? parseInt((Math.sqrt(dist) / maxDistance) * 999, 10) : 0;
    if (qty > 0) {
      chosenTickets.push(...extractTickets(qty, line, 0.001));
    }
    current = next;
  }

  return chosenTickets;
}

/**
 * "Helix" lottery — tickets sampled along a 3-D spiral through the cube.
 *
 * A helix is parameterised by a centre `(cx, cy)`, a radius `R`, a number of
 * turns, and a phase — all derived from the signature.  The curve climbs
 * the z-axis from 0 to 999 while rotating around the centre, so it sweeps a
 * cylindrical "tube" through the cube.  Points are sampled at evenly spaced
 * parameters and collapsed to tickets via `z·1e6 + y·1e3 + x`.
 *
 * The radius is clamped so the whole helix stays inside the cube (no
 * clipping at the walls), and the number of samples scales with the
 * signature length.  Coverage is a tube rather than the whole volume, so
 * the helix gives a distinct spatial pattern from the point-based and
 * line-based algos.
 *
 * @param {string} filtered_signature  The full numeric seed string.
 * @returns {number[]}  Array of integer tickets sampled along the helix.
 */
function helix(filtered_signature) {
  const chunks = chunk(filtered_signature, 9);
  if (!chunks.length) return [];

  const p1 = chunk(chunks[0], 3);
  const p2 = chunks[1] ? chunk(chunks[1], 3) : p1;
  const p3 = chunks[2] ? chunk(chunks[2], 3) : p1;

  // Centre near the middle of the cube; radius/phase/turns from more chunks.
  const cx = (filterParseInt(p1[0]) % 500) + 250;
  const cy = (filterParseInt(p1[1]) % 500) + 250;
  const maxR = Math.max(1, Math.min(cx, 999 - cx, cy, 999 - cy));
  const turns = (filterParseInt(p1[2]) % 4) + 2; // 2..5 turns
  const R = Math.min((filterParseInt(p2[0]) % 400) + 50, maxR);
  const phase = (filterParseInt(p2[1]) / 999) * Math.PI * 2;
  const zBias = (filterParseInt(p3[2]) % 100) / 100; // small vertical offset

  const n = Math.min(chunks.length * 100, 2000);
  const tickets = [];
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0; // 0..1
    const theta = phase + turns * 2 * Math.PI * t;
    const x = cx + R * Math.cos(theta);
    const y = cy + R * Math.sin(theta);
    const z = Math.max(0, Math.min(999, zBias * 999 + t * 999 * (1 - zBias)));
    const xi = Math.max(0, Math.min(999, Math.floor(x)));
    const yi = Math.max(0, Math.min(999, Math.floor(y)));
    const zi = Math.max(0, Math.min(999, Math.floor(z)));
    tickets.push(zi * 1000000 + yi * 1000 + xi);
  }
  return tickets;
}

/**
 * "Fireworks" lottery — radial bursts from multiple signature origins.
 *
 * Every signature chunk is treated as a **firework origin**; from each
 * origin, rays fly to one or more **endpoint** chunks and tickets are sampled
 * along each ray (using the linear-distance convention).  This is a
 * multi-origin generalisation of {@link barrel_of_fish}: instead of a single
 * point of impact, every chunk "explodes" and sprays tickets outward.
 *
 * Parameters (forwarded via `opts`):
 *   - `projectile`: `"beam"` → full-depth sampling (999 tickets per unit
 *     distance), anything else → shallow sampling (333 tickets).
 *   - `splinter`: `"yes"` → each origin sprays to **every** other chunk
 *     (many rays); anything else → each origin shoots only to the **next**
 *     chunk (a single ray).  A `MAX_LINES` cap bounds total work so an
 *     all-to-all splinter burst can't produce an unbounded ticket count.
 *
 * @param {string[]} initialChunks  Array of 9-digit numeric strings.
 * @param {number}   maxDistance     Maximum linear (Euclidean) distance between
 *   two points in the `[0,999]³` cube — normalisation bound for ticket counts.
 * @param {string}   projectile     `"beam"` for full-depth, other for shallow.
 * @param {string}   splinter       `"yes"` for all-to-all rays, other for
 *   single-ray-per-origin.
 * @returns {number[]}  Extracted integer tickets.
 */
function fireworks(initialChunks, maxDistance, projectile, splinter) {
  const projectileDepth = projectile === "beam" ? 999 : 333;
  const MAX_LINES = 50; // bound total ray count
  const chosenTickets = [];
  let lineCount = 0;

  for (let o = 0; o < initialChunks.length && lineCount < MAX_LINES; o++) {
    const originParts = chunk(initialChunks[o], 3);
    const oVec = new Vector3(
      filterParseInt(originParts[0]),
      filterParseInt(originParts[1]),
      filterParseInt(originParts[2]),
    );

    const endpointChunks =
      splinter === "yes"
        ? initialChunks.filter((_, idx) => idx !== o)
        : initialChunks[o + 1]
          ? [initialChunks[o + 1]]
          : [];

    for (const ep of endpointChunks) {
      if (lineCount >= MAX_LINES) break;
      const epParts = chunk(ep, 3);
      const epVec = new Vector3(
        filterParseInt(epParts[0]),
        filterParseInt(epParts[1]),
        filterParseInt(epParts[2]),
      );
      const line = new Line3(oVec, epVec);
      const dist = oVec.distanceToSquared(epVec);
      const qty = dist > 0 ? parseInt((Math.sqrt(dist) / maxDistance) * projectileDepth, 10) : 0;
      if (qty > 0) {
        chosenTickets.push(...extractTickets(qty, line, 0.001));
      }
      lineCount++;
    }
  }
  return chosenTickets;
}

/**
 * "Hash" lottery — uniformly distributed tickets from a signature-seeded PRNG.
 *
 * The signature is reduced to a 32-bit seed with the FNV-1a hash, then a
 * **xorshift32** pseudo-random generator (period 2³²−1) emits `N` tickets in
 * the full `[0, 999,999,999]` range.  Because xorshift32 has excellent
 * equidistribution, the tickets are spread uniformly across the range — far
 * better than the naive digit parsing of `forward`/`reverse` (which leaves a
 * leading-zero bias and only spans the digits literally present).
 *
 * This is a purely **numeric** algorithm (no 3-D geometry), so it fills the
 * niche of a fair, seed-derived lottery that doesn't depend on the vector
 * encoding.  The same signature always yields the same tickets, so results
 * stay verifiable.
 *
 * @param {string} filtered_signature  The full numeric seed string.
 * @returns {number[]}  Array of uniformly distributed integer tickets.
 */
function hash(filtered_signature) {
  // FNV-1a 32-bit hash of the signature → deterministic, well-mixed seed.
  let h = 0x811c9dc5;
  for (let i = 0; i < filtered_signature.length; i++) {
    h ^= filtered_signature.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // xorshift32 PRNG (non-zero seed guaranteed).
  let state = h >>> 0 || 0x9e3779b9;
  const n = Math.min(filtered_signature.length * 100, 5000);
  const tickets = [];
  for (let i = 0; i < n; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state = state >>> 0;
    tickets.push(state % 1000000000);
  }
  return tickets;
}

// ---------------------------------------------------------------------------
// Filter algorithms (operate on the loaded candidate pool)
// ---------------------------------------------------------------------------

/**
 * "Freebie" filter — every leaderboard participant receives exactly one
 * ticket at the start of their range.
 *
 * Unlike the lottery algorithms above, this does **not** use the seed
 * signature at all.  It simply maps each account to its `range.from`
 * value, giving every participant a single guaranteed draw.
 *
 * @param {Array<{id:string, range:{from:number, to:number}}>} leaderboardJSON
 *   Weighted leaderboard entries.
 * @returns {number[]}  One ticket per account (the account's range start).
 */
function freebie(leaderboardJSON) {
  return leaderboardJSON.map((user) => user.range.from);
}

// ---------------------------------------------------------------------------
// Core dispatcher & orchestrator
// ---------------------------------------------------------------------------

/**
 * Dispatch to the correct lottery or filter algorithm.
 *
 * Lottery algorithms (forward, reverse, pi, reverse_pi, cubed,
 * avg_point_lines, alien_blood, bouncing_ball, barrel_of_fish, golden, hash,
 * walk, helix, fireworks) require a `filtered_signature` of at least 9
 * characters.  The `freebie` filter ignores the signature entirely and
 * operates only on the leaderboard.
 *
 * @param {string} algoType           Algorithm key — one of `"forward"`,
 *   `"reverse"`, `"pi"`, `"reverse_pi"`, `"cubed"`, `"avg_point_lines"`,
 *   `"alien_blood"`, `"bouncing_ball"`, `"barrel_of_fish"`, `"golden"`,
 *   `"hash"`, `"walk"`, `"helix"`, `"fireworks"`, `"freebie"`.
 * @param {string} filtered_signature Numeric seed string produced by
 *   {@link filterSignature}.  Ignored by `"freebie"`.
 * @param {Array}  leaderboardJSON    Weighted leaderboard (only used by
 *   `"freebie"`).
 * @param {object} [opts={}]          Extra options forwarded to
 *   `"barrel_of_fish"` and `"fireworks"`:
 * @param {string} [opts.bof_projectile]  `"beam"` for full-depth, other
 *   for shallow (barrel_of_fish).
 * @param {string} [opts.bof_splinter]    `"yes"` for multi-endpoint mode
 *   (barrel_of_fish).
 * @param {string} [opts.fw_projectile]   `"beam"` for full-depth, other
 *   for shallow (fireworks).
 * @param {string} [opts.fw_splinter]     `"yes"` for all-to-all rays, other
 *   for single-ray-per-origin (fireworks).
 * @returns {number[]}  Array of integer ticket numbers produced by the
 *   chosen algorithm, or `[]` if the algorithm is unknown or the
 *   signature is too short.
 */
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
    "golden",
    "hash",
    "walk",
    "helix",
    "fireworks",
  ];
  const isLottery = LOTTERY.includes(algoType);
  if (isLottery && (!filtered_signature || filtered_signature.length < 9)) {
    return [];
  }
  const initialChunks = isLottery ? chunk(filtered_signature, 9) : [];
  const minVector = new Vector3(0, 0, 0);
  const maxVector = new Vector3(999, 999, 999);
  // Maximum *linear* (Euclidean) distance between any two points in the
  // [0,999]³ cube (corner-to-corner).  Used as the normalisation bound so the
  // geometric algorithms' ticket counts are proportional to length (uniform
  // density per unit length) rather than to length squared.
  const maxDistance = Math.sqrt(minVector.distanceToSquared(maxVector));
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
    case "golden":
      return golden(filtered_signature);
    case "hash":
      return hash(filtered_signature);
    case "walk":
      return walk(initialChunks, maxDistance);
    case "helix":
      return helix(filtered_signature);
    case "fireworks":
      return fireworks(
        initialChunks,
        maxDistance,
        opts.fw_projectile,
        opts.fw_splinter,
      );
    case "freebie":
      return freebie(leaderboardJSON);
    default:
      return [];
  }
}

/**
 * Convert a block's `witness_signature` string into a purely numeric seed
 * that drives all lottery algorithms.
 *
 * Digits (`0`–`9`) pass through unchanged.  Letters are replaced by their
 * character code (e.g. `'a'` → `'97'`, `'Z'` → `'90'`), producing a long
 * numeric string whose length and value depend on the original signature.
 *
 * The result is deterministic: the same `witnessSignature` always yields
 * the same seed, which is essential for verifiability.
 *
 * @param {string} witnessSignature  The hex/ASCII signature string from
 *   the block header.
 * @returns {string}  A string consisting only of digits.
 */
function filterSignature(witnessSignature) {
  return witnessSignature
    .split("")
    .map((char) => (isCharNumber(char) ? char : char.charCodeAt(0).toString()))
    .join("");
}

/**
 * Run a full lottery calculation across one or more algorithms and map
 * the drawn tickets back to leaderboard accounts.
 *
 * For each algorithm in `distributions`:
 *   1. Generate tickets via {@link getTickets}.
 *   2. If `deduplicate === "Yes"`, remove duplicate tickets **and** exclude
 *      any tickets that were already produced by earlier algorithms in this
 *      run.
 *   3. If `alwaysWinning === "Yes"` and a leaderboard is provided, wrap
 *      each ticket number so it falls within the total leaderboard range
 *      (via modulo arithmetic).  This guarantees every drawn ticket maps
 *      to an account.
 *   4. Map each ticket to the account whose leaderboard range contains it.
 *
 * @param {string} filtered_signature  Numeric seed from {@link filterSignature}.
 * @param {string[]} distributions     Array of algorithm keys (e.g.
 *   `["forward", "cubed"]`).
 * @param {string} deduplicate         `"Yes"` to remove duplicate / repeat
 *   tickets across algorithms.
 * @param {string} alwaysWinning       `"Yes"` to wrap ticket numbers into
 *   the leaderboard range so every ticket maps to an account.
 * @param {Array<{id:string, name:string, range:{from:number,to:number}}>}
 *   leaderboardJSON  Weighted leaderboard entries.
 * @param {object} [opts={}]  Extra options forwarded to individual
 *   algorithms (see {@link getTickets}).
 * @returns {{
 *   summary: Array<{
 *     id: string,
 *     name: string|undefined,
 *     tickets: Array<{ticket:number, algo:string, value:number}>,
 *     qty: number,
 *     ticketsValue: number,
 *     percent: string
 *   }>,
 *   generatedNumbers: Object<string, number[]>
 * }}
 *   `summary` — per-account aggregated results sorted by ticket count.
 *   `generatedNumbers` — raw ticket arrays keyed by algorithm name.
 */
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
  golden,
  hash,
  walk,
  helix,
  fireworks,
};

/**
 * Lottery over the entire account space (1.2.1 .. 1.2.maxAccountId).
 *
 * Used when the candidate pool is "all accounts" — we never enumerate
 * millions of on-chain entries.  Instead each drawn ticket number is
 * mapped directly to an account id via modulo arithmetic:
 *
 *     accountNum = ((ticket % maxAccountId) + maxAccountId) % maxAccountId
 *     accountId  = "1.2." + accountNum
 *
 * Multiple algorithms can be combined; each drawn ticket increments that
 * account's hit count.  The returned array is **not** a leaderboard
 * (no ranges), but a hit-count summary suitable for display or further
 * filtering.
 *
 * @param {string[]} algoTypes         Array of lottery algorithm keys
 *   (e.g. `["forward", "cubed"]`).
 * @param {string}   filtered_signature  Numeric seed string produced by
 *   {@link filterSignature}.
 * @param {number}   maxAccountId      Highest existing account id on the
 *   chain (e.g. `1.2.1234567` → use `1234567`).
 * @returns {Array<{
 *   id: string,
 *   name: undefined,
 *   qty: number,
 *   ticketsValue: number,
 *   percent: string
 * }>}
 *   Array of `{ id, name, qty, ticketsValue, percent }` objects for every
 *   account that received at least one hit.  `name` is always `undefined`
 *   (the caller may enrich it separately if needed).  `percent` is always
 *   `"0"` (no leaderboard weighting in this mode).
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
