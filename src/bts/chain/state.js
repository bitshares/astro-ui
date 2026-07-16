/**
 * Tiny shared-state closure helpers, used by AccountLogin.
 *
 * Ported from bitsharesjs `lib/chain/src/state.js`.
 * Modernized: ES module named exports, no external dependencies.
 */

function get(state) {
  return function (key) {
    return state[key] || "";
  };
}

function set(state) {
  return function (key, value) {
    state[key] = value;
    return this;
  };
}

export { get, set };
