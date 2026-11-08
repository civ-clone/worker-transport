# worker-transport

A [`core-data-client`](https://github.com/civ-clone/core-data-client) transport over a web worker's messages, for a game that runs in a worker and a page that shows it.

- **`WorkerTransport`**: the page's end, over the `Worker` it started. What arrives as a `DataObject`'s `ObjectMap` is rebuilt with `reconstituteData` before a listener gets it (the raw map comes too, as `rawData`), but for the `rawChannels` it is given, whose listeners rebuild it themselves. The worker's uncaught errors, a message that can't be read, a request the worker couldn't answer, and the worker going quiet while requests wait on it all reach the listeners of the `errorChannel` it is given (`workerError` unless given), as `WorkerError`s, as though the worker had sent them.
- **`ParentTransport`**: the worker's end, over its own `postMessage` and `message` events.

Both send a `DataObject` as its plain object, and carry each request's id so that `AbstractTransport` matches each reply to its request.

civ.one's web renderer (civ-clone/web-renderer) uses both, with `gameData` as a raw channel.
