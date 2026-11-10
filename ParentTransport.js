"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ParentTransport_heard, _ParentTransport_serialise;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParentTransport = void 0;
const AbstractTransport_1 = require("@civ-clone/core-data-client/AbstractTransport");
const serialise_1 = require("./serialise");
/**
 * The worker's end of a transport over its messages, to the page that started it.
 *
 * What it asks the page is a choice put to a person, who may take any time over it, so the page's silence is never
 * timed (civ-clone/web-renderer#871) unless a `silenceTimeout` is given. Every message from the page is heard as the
 * page still being there, which only matters to one that times it.
 *
 * What it is given to send is posted as its `serialise` option makes it. Unless given one, a `DataObject` goes as its
 * `toPlainObject()`, everything it reaches as every player sees it: a caller that sends what one player may see
 * serialises it first, with its own registry and filter, or gives the transport a serialiser that does.
 */
class ParentTransport extends AbstractTransport_1.default {
    constructor({ serialise = serialise_1.default, ...options } = {}) {
        var _a;
        // One left out, or given as `undefined` (a setting that was never set, passed straight on), is not timed either.
        super({ ...options, silenceTimeout: (_a = options.silenceTimeout) !== null && _a !== void 0 ? _a : null });
        // What the transport itself listens with, for `dispose` to stop.
        _ParentTransport_heard.set(this, () => this.heard());
        _ParentTransport_serialise.set(this, void 0);
        __classPrivateFieldSet(this, _ParentTransport_serialise, serialise, "f");
        addEventListener('message', __classPrivateFieldGet(this, _ParentTransport_heard, "f"));
    }
    /** Stops hearing the page, rejects each request still waiting and removes the reply listeners. */
    dispose() {
        removeEventListener('message', __classPrivateFieldGet(this, _ParentTransport_heard, "f"));
        super.dispose();
    }
    receive(channel, handler) {
        const listener = ({ data: { channel: receivingChannel, data, id }, }) => {
            if (channel === receivingChannel) {
                handler(data, { id });
            }
        };
        addEventListener('message', listener);
        return () => {
            removeEventListener('message', listener);
        };
    }
    receiveOnce(channel, handler) {
        const fullHandler = ({ data: { channel: receivingChannel, data, id }, }) => {
            if (channel === receivingChannel) {
                handler(data, { id });
                removeEventListener('message', fullHandler);
            }
        };
        addEventListener('message', fullHandler);
        return () => {
            removeEventListener('message', fullHandler);
        };
    }
    // `id` is the request this answers, when it is a reply (civ-clone/web-renderer#470).
    post(channel, data, id) {
        postMessage({
            channel,
            data: __classPrivateFieldGet(this, _ParentTransport_serialise, "f").call(this, data),
            ...(id === undefined ? {} : { id }),
        });
    }
}
exports.ParentTransport = ParentTransport;
_ParentTransport_heard = new WeakMap(), _ParentTransport_serialise = new WeakMap();
exports.default = ParentTransport;
//# sourceMappingURL=ParentTransport.js.map