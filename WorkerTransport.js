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
var _WorkerTransport_instances, _WorkerTransport_worker, _WorkerTransport_rawChannels, _WorkerTransport_errorChannel, _WorkerTransport_passingOn, _WorkerTransport_passOn, _WorkerTransport_payload;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerTransport = void 0;
const AbstractTransport_1 = require("@civ-clone/core-data-client/AbstractTransport");
const DataObject_1 = require("@civ-clone/core-data-object/DataObject");
const reconstituteData_1 = require("@civ-clone/core-data-client/reconstituteData");
/** The page's end of a transport over a web worker's messages. */
class WorkerTransport extends AbstractTransport_1.default {
    constructor(worker, { rawChannels = [], errorChannel = 'workerError', ...options } = {}) {
        super(options);
        _WorkerTransport_instances.add(this);
        _WorkerTransport_worker.set(this, void 0);
        _WorkerTransport_rawChannels.set(this, void 0);
        _WorkerTransport_errorChannel.set(this, void 0);
        // Set while the page's own errors go to their listeners, which is not the worker saying anything.
        _WorkerTransport_passingOn.set(this, false);
        __classPrivateFieldSet(this, _WorkerTransport_worker, worker, "f");
        __classPrivateFieldSet(this, _WorkerTransport_rawChannels, new Set(rawChannels), "f");
        __classPrivateFieldSet(this, _WorkerTransport_errorChannel, errorChannel, "f");
        // Every message from the worker says it is still there (#470).
        worker.addEventListener('message', () => {
            if (!__classPrivateFieldGet(this, _WorkerTransport_passingOn, "f")) {
                this.heard();
            }
        });
        // An error the worker didn't catch, or a message that couldn't be read, reaches the page only as an event on the
        //  `Worker`, which nothing would hear (#470).
        worker.addEventListener('error', (event) => { var _a; return __classPrivateFieldGet(this, _WorkerTransport_instances, "m", _WorkerTransport_passOn).call(this, { message: (_a = event.message) !== null && _a !== void 0 ? _a : '' }); });
        worker.addEventListener('messageerror', () => __classPrivateFieldGet(this, _WorkerTransport_instances, "m", _WorkerTransport_passOn).call(this, { message: '' }));
    }
    // A request the worker could not answer, said as the worker's own errors are.
    requestRejected(error) {
        __classPrivateFieldGet(this, _WorkerTransport_instances, "m", _WorkerTransport_passOn).call(this, { message: error.message });
    }
    // The worker has said nothing for a while with a request waiting on it. The page says so in its own words: the
    //  channels are no help to a player, and are in the console.
    notAnswering() {
        __classPrivateFieldGet(this, _WorkerTransport_instances, "m", _WorkerTransport_passOn).call(this, { message: '', notAnswering: true });
    }
    receive(channel, handler) {
        const listener = ({ data: { channel: receivingChannel, data, id }, }) => {
            // Only reconstitute payloads for the channel this listener cares about;
            // reconstituting first meant every listener rebuilt the full object
            // graph for every hierarchy-shaped message on any channel.
            if (channel !== receivingChannel) {
                return;
            }
            handler(__classPrivateFieldGet(this, _WorkerTransport_instances, "m", _WorkerTransport_payload).call(this, channel, data), {
                rawData: data,
                id,
            });
        };
        __classPrivateFieldGet(this, _WorkerTransport_worker, "f").addEventListener('message', listener);
        return () => {
            __classPrivateFieldGet(this, _WorkerTransport_worker, "f").removeEventListener('message', listener);
        };
    }
    receiveOnce(channel, handler) {
        const onceHandler = ({ data: { channel: receivingChannel, data, id }, }) => {
            if (channel !== receivingChannel) {
                return;
            }
            handler(__classPrivateFieldGet(this, _WorkerTransport_instances, "m", _WorkerTransport_payload).call(this, channel, data), {
                rawData: data,
                id,
            });
            __classPrivateFieldGet(this, _WorkerTransport_worker, "f").removeEventListener('message', onceHandler);
        };
        __classPrivateFieldGet(this, _WorkerTransport_worker, "f").addEventListener('message', onceHandler);
        return () => {
            __classPrivateFieldGet(this, _WorkerTransport_worker, "f").removeEventListener('message', onceHandler);
        };
    }
    post(channel, data, id) {
        if (data instanceof DataObject_1.default) {
            data = data.toPlainObject();
        }
        __classPrivateFieldGet(this, _WorkerTransport_worker, "f").postMessage({
            channel,
            data,
            ...(id === undefined ? {} : { id }),
        });
    }
}
exports.WorkerTransport = WorkerTransport;
_WorkerTransport_worker = new WeakMap(), _WorkerTransport_rawChannels = new WeakMap(), _WorkerTransport_errorChannel = new WeakMap(), _WorkerTransport_passingOn = new WeakMap(), _WorkerTransport_instances = new WeakSet(), _WorkerTransport_passOn = function _WorkerTransport_passOn(error) {
    __classPrivateFieldSet(this, _WorkerTransport_passingOn, true, "f");
    try {
        __classPrivateFieldGet(this, _WorkerTransport_worker, "f").dispatchEvent(new MessageEvent('message', {
            data: { channel: __classPrivateFieldGet(this, _WorkerTransport_errorChannel, "f"), data: error },
        }));
    }
    finally {
        __classPrivateFieldSet(this, _WorkerTransport_passingOn, false, "f");
    }
}, _WorkerTransport_payload = function _WorkerTransport_payload(channel, data) {
    return (data === null || data === void 0 ? void 0 : data.hierarchy) && !__classPrivateFieldGet(this, _WorkerTransport_rawChannels, "f").has(channel)
        ? (0, reconstituteData_1.default)(data)
        : data;
};
exports.default = WorkerTransport;
//# sourceMappingURL=WorkerTransport.js.map