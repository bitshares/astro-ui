import { EventEmitter } from "events";

/**
 * Process-wide singleton event emitter.
 *
 * Ported from bitsharesjs `lib/chain/src/EmitterInstance.js`.
 * Modernized: uses Node's built-in `events` EventEmitter instead of the
 * `event-emitter` npm package. No new dependencies.
 */

let _emitter = null;

export default function emitter() {
  if (!_emitter) {
    _emitter = new EventEmitter();
    // Avoid Node's default "too many listeners" warning for the shared bus.
    _emitter.setMaxListeners(0);
  }
  return _emitter;
}
