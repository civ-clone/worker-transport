"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ParentTransport_heard;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParentTransport = void 0;
const AbstractTransport_1 = require("@civ-clone/core-data-client/AbstractTransport");
const DataObject_1 = require("@civ-clone/core-data-object/DataObject");
/**
 * The worker's end of a transport over its messages, to the page that started it.
 *
 * What it asks the page is a choice put to a person, who may take any time over it, so the page's silence is never
 * timed (civ-clone/web-renderer#871) unless a `silenceTimeout` is given. Every message from the page is heard as the
 * page still being there, which only matters to one that times it.
 */
class ParentTransport extends AbstractTransport_1.default {
    constructor(options = {}) {
        var _a;
        // One left out, or given as `undefined` (a setting that was never set, passed straight on), is not timed either.
        super({ ...options, silenceTimeout: (_a = options.silenceTimeout) !== null && _a !== void 0 ? _a : null });
        // What the transport itself listens with, for `dispose` to stop.
        _ParentTransport_heard.set(this, () => this.heard());
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
        if (data instanceof DataObject_1.default) {
            data = data.toPlainObject();
        }
        postMessage({
            channel,
            data,
            ...(id === undefined ? {} : { id }),
        });
    }
}
exports.ParentTransport = ParentTransport;
_ParentTransport_heard = new WeakMap();
exports.default = ParentTransport;
//# sourceMappingURL=ParentTransport.js.map