# worker-transport

A [`core-data-client`](https://github.com/civ-clone/core-data-client) transport over a web worker's messages, for a game that runs in a worker and a page that shows it.

- **`WorkerTransport`**: the page's end, over the `Worker` it started. What arrives as a `DataObject`'s `ObjectMap` is rebuilt with `reconstituteData` before a listener gets it (the raw map comes too, as `rawData`), but for the `rawChannels` it is given, whose listeners rebuild it themselves. The worker's uncaught errors, a message that can't be read, a request the worker couldn't answer, and the worker going quiet while requests wait on it all reach the listeners of the `errorChannel` it is given (`workerError` unless given), as `WorkerError`s, as though the worker had sent them. Requests waiting on a worker whose script could not be loaded (a bare `error` event before it has said anything) are rejected, as it will answer nothing. `dispose()` stops what the transport itself listens to on the worker and rejects what still waits; the worker is left running.
- **`ParentTransport`**: the worker's end, over its own `postMessage` and `message` events. What it asks the page is a person's choice, which can take any time, so the page's silence is never timed unless it is given a `silenceTimeout`.

Both send a `DataObject` as its plain object, and carry each request's id so that `AbstractTransport` matches each reply to its request.

civ.one's web renderer (civ-clone/web-renderer) uses both, with `gameData` as a raw channel.
