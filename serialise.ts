import DataObject from '@civ-clone/core-data-object/DataObject';

/** Turns what a transport is given to send into what it posts: something a worker's messages can carry. */
export type Serialiser = (data: unknown) => unknown;

/**
 * What both transports serialise with unless given another: a `DataObject` as its `toPlainObject()`, and anything else
 * as it is.
 *
 * `toPlainObject()` with nothing given uses the process-wide `AdditionalDataRegistry` and no filter, so a game object
 * sent this way goes with everything it reaches, as every player sees it. A caller that sends what one player may see
 * serialises it itself, with its own registry and filter, and sends the `ObjectMap`; or sends an object whose own
 * `toPlainObject()` does that. A transport given `(data) => data` posts what it is given.
 */
export const serialiseDataObjects: Serialiser = (data) =>
  data instanceof DataObject ? data.toPlainObject() : data;

export default serialiseDataObjects;
