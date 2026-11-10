"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParentTransport = void 0;
const AbstractTransport_1 = require("@civ-clone/core-data-client/AbstractTransport");
const DataObject_1 = require("@civ-clone/core-data-object/DataObject");
/**
 * The worker's end of a transport over its messages, to the page that started it.
 *
 * What it asks the page is a choice put to a person, who may take any time over it, so the page's silence is never
 * timed (civ-clone/web-renderer#871) unless a `silenceTimeout` is given. Nor does it call `heard()`: nothing here
 * would act on it.
 */
class ParentTransport extends AbstractTransport_1.default {
    constructor(options = {}) {
        super({ silenceTimeout: null, ...options });
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
exports.default = ParentTransport;
//# sourceMappingURL=ParentTransport.js.map