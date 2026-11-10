"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serialiseDataObjects = void 0;
const DataObject_1 = require("@civ-clone/core-data-object/DataObject");
/**
 * What both transports serialise with unless given another: a `DataObject` as its `toPlainObject()`, and anything else
 * as it is.
 *
 * `toPlainObject()` with nothing given uses the process-wide `AdditionalDataRegistry` and no filter, so a game object
 * sent this way goes with everything it reaches, as every player sees it. A caller that sends what one player may see
 * serialises it itself, with its own registry and filter, and sends the `ObjectMap`; or sends an object whose own
 * `toPlainObject()` does that. A transport given `(data) => data` posts what it is given.
 */
const serialiseDataObjects = (data) => data instanceof DataObject_1.default ? data.toPlainObject() : data;
exports.serialiseDataObjects = serialiseDataObjects;
exports.default = exports.serialiseDataObjects;
//# sourceMappingURL=serialise.js.map