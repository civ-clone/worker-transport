import {
  WorkerError,
  WorkerTransport,
  neverRanMessage,
} from '../WorkerTransport';
import {
  RequestFailed,
  disposedMessage,
} from '@civ-clone/core-data-client/AbstractTransport';
import { Request } from '@civ-clone/core-data-client/Request';
import { TransportData } from '@civ-clone/core-data-client/Transport';
import DataObject from '@civ-clone/core-data-object/DataObject';
import { expect } from 'chai';

type Listener = (event: any) => void;

// Any channel, carrying anything: `WorkerTransport<any>` would hand its listeners `unknown`.
type AnyChannels = { [channel: string]: TransportData<any, any> };

// A `Worker` the test speaks for.
class FakeWorker {
  listeners: { [type: string]: Listener[] } = {};
  posted: any[] = [];

  addEventListener(type: string, listener: Listener): void {
    (this.listeners[type] ??= []).push(listener);
  }

  removeEventListener(type: string, listener: Listener): void {
    const listeners = this.listeners[type] ?? [];

    listeners.splice(listeners.indexOf(listener), 1);
  }

  dispatchEvent(event: any): boolean {
    [...(this.listeners[event.type] ?? [])].forEach((listener) =>
      listener(event)
    );

    return true;
  }

  postMessage(message: any): void {
    this.posted.push(message);
  }

  // A message from the worker.
  say(data: any): void {
    this.dispatchEvent({ type: 'message', data });
  }
}

class Thing extends DataObject {
  name = 'Karakorum';

  constructor() {
    super();

    this.addKey('name');
  }
}

// Timers the test runs out by hand.
class FakeTimers {
  #next = 1;
  pending: Map<number, () => void> = new Map();

  set = (callback: () => void): unknown => {
    const handle = this.#next++;

    this.pending.set(handle, callback);

    return handle;
  };

  clear = (handle: unknown): void => {
    this.pending.delete(handle as number);
  };

  // Runs out every silence being timed.
  runOut(): void {
    const warn = console.warn;

    console.warn = () => {};

    try {
      const pending = [...this.pending.values()];

      this.pending.clear();
      pending.forEach((callback) => callback());
    } finally {
      console.warn = warn;
    }
  }
}

// How many listeners the worker has, of every kind.
const listening = (worker: FakeWorker): number =>
  Object.values(worker.listeners).reduce(
    (total, listeners) => total + listeners.length,
    0
  );

// A promise's outcome so far, without waiting on it any longer than the microtasks already queued.
const settled = async (promise: Promise<any>): Promise<string> => {
  let state = 'waiting';

  promise.then(
    () => (state = 'resolved'),
    () => (state = 'rejected')
  );

  await new Promise((resolve) => setTimeout(resolve, 0));

  return state;
};

const objectMap = {
    hierarchy: { '#ref': 'city-1' },
    objects: { 'city-1': { id: 'city-1', name: 'Karakorum' } },
  },
  transportFor = (worker: FakeWorker, options = {}) =>
    new WorkerTransport<AnyChannels>(worker as unknown as Worker, options);

describe('WorkerTransport', (): void => {
  it('hands a listener its channel’s data, rebuilt from its object map, with the map as it came', (): void => {
    const worker = new FakeWorker(),
      transport = transportFor(worker),
      heard: any[] = [];

    transport.receive('city', (data, meta) => heard.push([data, meta]));

    worker.say({ channel: 'other', data: objectMap });
    worker.say({ channel: 'city', data: objectMap });

    expect(heard).to.deep.equal([
      [
        { id: 'city-1', name: 'Karakorum' },
        { rawData: objectMap, id: undefined },
      ],
    ]);
  });

  it('hands a raw channel’s data over as it came', (): void => {
    const worker = new FakeWorker(),
      transport = transportFor(worker, { rawChannels: ['gameData'] }),
      heard: any[] = [];

    transport.receive('gameData', (data) => heard.push(data));
    worker.say({ channel: 'gameData', data: objectMap });

    expect(heard).to.deep.equal([objectMap]);
  });

  it('hears a channel once with receiveOnce', (): void => {
    const worker = new FakeWorker(),
      transport = transportFor(worker),
      heard: any[] = [];

    transport.receiveOnce('ready', (data) => heard.push(data));
    worker.say({ channel: 'ready', data: 1 });
    worker.say({ channel: 'ready', data: 2 });

    expect(heard).to.deep.equal([1]);
  });

  it('stops hearing a channel once disposed', (): void => {
    const worker = new FakeWorker(),
      transport = transportFor(worker),
      heard: any[] = [],
      dispose = transport.receive('ready', (data) => heard.push(data));

    dispose();
    worker.say({ channel: 'ready', data: 1 });

    expect(heard).to.deep.equal([]);
  });

  it('posts a request with its id, and resolves it with the reply that echoes it', async (): Promise<void> => {
    const worker = new FakeWorker(),
      transport = transportFor(worker),
      asked = transport.request(new Request('topCities', 5));

    expect(worker.posted).to.deep.equal([
      { channel: 'topCities', data: 5, id: 1 },
    ]);

    worker.say({ channel: 'topCities', data: ['Karakorum'], id: 1 });

    expect(await asked).to.deep.equal(['Karakorum']);
  });

  it('sends without an id when it isn’t a request', (): void => {
    const worker = new FakeWorker();

    transportFor(worker).send('action', { name: 'EndTurn' });

    expect(worker.posted).to.deep.equal([
      { channel: 'action', data: { name: 'EndTurn' } },
    ]);
  });

  it('passes the worker’s own errors on to the error channel', (): void => {
    const worker = new FakeWorker(),
      transport = transportFor(worker, { errorChannel: 'failed' }),
      heard: WorkerError[] = [];

    transport.receive('failed', (data) => heard.push(data));

    worker.dispatchEvent({
      type: 'error',
      message: 'Uncaught TypeError: it broke',
    });
    worker.dispatchEvent({ type: 'messageerror' });

    expect(heard).to.deep.equal([
      { message: 'Uncaught TypeError: it broke' },
      { message: '' },
    ]);
  });

  it('passes a request the worker couldn’t answer on to `workerError`, unless told otherwise', async (): Promise<void> => {
    const worker = new FakeWorker(),
      transport = transportFor(worker),
      heard: WorkerError[] = [],
      asked = transport
        .request(new Request('topCities'))
        .catch((error) => error);

    transport.receive('workerError', (data) => heard.push(data));
    worker.say({
      channel: 'requestFailed',
      data: { channel: 'topCities', message: 'no such game', id: 1 },
    });

    expect((await asked).message).to.equal('no such game');
    expect(heard).to.deep.equal([{ message: 'no such game' }]);
  });

  it('rejects what waits on a worker whose script could not be loaded, which says so with a bare error', async (): Promise<void> => {
    const worker = new FakeWorker(),
      transport = transportFor(worker),
      heard: WorkerError[] = [],
      first = transport.request(new Request('options')).catch((error) => error),
      second = transport
        .request(new Request('civilizations'))
        .catch((error) => error);

    // A listener that asks again when told of the failure is not answered with the same failure.
    let again: Promise<any> | undefined;

    transport.receive('workerError', (data: WorkerError) => {
      heard.push(data);
      again ??= transport.request(new Request('options'));
    });
    worker.dispatchEvent({ type: 'error' });

    const errors = [await first, await second];

    expect(errors.map((error) => error instanceof RequestFailed)).to.deep.equal(
      [true, true]
    );
    expect(
      errors.map(({ channel, message }) => [channel, message])
    ).to.deep.equal([
      ['options', neverRanMessage],
      ['civilizations', neverRanMessage],
    ]);
    // Said once, as the worker's error: not again for each request.
    expect(heard).to.deep.equal([{ message: '' }]);

    worker.say({ channel: 'options', data: 'late', id: 3 });

    expect(await again).to.equal('late');
  });

  it('leaves requests waiting when a worker that has yet to speak throws: it may only not have been asked anything it answers', async (): Promise<void> => {
    const worker = new FakeWorker(),
      transport = transportFor(worker),
      asked = transport.request(new Request('topCities'));

    worker.dispatchEvent({
      type: 'error',
      message: 'Uncaught Error: a rule',
      filename: 'backend.js',
    });
    worker.say({ channel: 'topCities', data: ['Karakorum'], id: 1 });

    expect(await asked).to.deep.equal(['Karakorum']);
  });

  it('leaves requests waiting when a worker that has spoken sends a bare error: it ran', async (): Promise<void> => {
    const worker = new FakeWorker(),
      transport = transportFor(worker),
      asked = transport.request(new Request('topCities'));

    worker.say({ channel: 'ready', data: null });
    worker.dispatchEvent({ type: 'error' });
    worker.say({ channel: 'topCities', data: ['Karakorum'], id: 1 });

    expect(await asked).to.deep.equal(['Karakorum']);
  });

  it('disposed of, listens to nothing on the worker and rejects what waits', async (): Promise<void> => {
    const worker = new FakeWorker(),
      transport = transportFor(worker),
      listening = (): number =>
        Object.values(worker.listeners).reduce(
          (total, listeners) => total + listeners.length,
          0
        ),
      asked = transport
        .request(new Request('topCities'))
        .catch((error) => error);

    // Its own three, and the request's two: its replies and `requestFailed`.
    expect(listening()).to.equal(5);

    transport.dispose();

    expect(listening()).to.equal(0);
    expect((await asked).message).to.equal(disposedMessage);

    const after = await transport
      .request(new Request('topCities'))
      .catch((error) => error);

    expect(after.message).to.equal(disposedMessage);
    expect(worker.posted.length).to.equal(1);
  });

  it('says so on the error channel when the worker goes quiet while a request waits, with the timers it is given', async (): Promise<void> => {
    const worker = new FakeWorker(),
      pending: (() => void)[] = [],
      timers = {
        set: (callback: () => void): unknown => pending.push(callback),
        clear: (): void => {},
      },
      transport = transportFor(worker, { timers }),
      heard: WorkerError[] = [],
      warn = console.warn;

    transport.receive('workerError', (data) => heard.push(data));
    worker.say({ channel: 'ready', data: null });
    transport.request(new Request('topCities'));

    console.warn = () => {};

    try {
      pending.splice(0).forEach((callback) => callback());
    } finally {
      console.warn = warn;
    }

    expect(heard).to.deep.equal([{ message: '', notAnswering: true }]);
  });

  it('posts a `DataObject` it is given to send as its plain object, and anything else as it is', (): void => {
    const worker = new FakeWorker(),
      transport = transportFor(worker),
      thing = new Thing();

    transport.send('city', thing);
    transport.reply('city', thing, 4);
    transport.send('city', { name: 'Karakorum' });

    expect(worker.posted).to.deep.equal([
      { channel: 'city', data: thing.toPlainObject() },
      { channel: 'city', data: thing.toPlainObject(), id: 4 },
      { channel: 'city', data: { name: 'Karakorum' } },
    ]);
  });

  it('posts what it sends, replies and asks as the serialiser it is given makes it', (): void => {
    const worker = new FakeWorker(),
      given: unknown[] = [],
      transport = transportFor(worker, {
        silenceTimeout: null,
        serialise: (data: unknown) => {
          given.push(data);

          return 'serialised';
        },
      }),
      thing = new Thing();

    transport.send('city', thing);
    transport.reply('city', 1, 4);
    transport.request(new Request('topCities', 5));

    expect(given).to.deep.equal([thing, 1, 5]);
    expect(worker.posted).to.deep.equal([
      { channel: 'city', data: 'serialised' },
      { channel: 'city', data: 'serialised', id: 4 },
      { channel: 'topCities', data: 'serialised', id: 1 },
    ]);
  });

  it('leaves what waits waiting when a worker that has spoken throws, says so, and goes on timing its silence', async (): Promise<void> => {
    const worker = new FakeWorker(),
      timers = new FakeTimers(),
      transport = transportFor(worker, { timers }),
      heard: WorkerError[] = [];

    transport.receive('workerError', (data) => heard.push(data));
    worker.say({ channel: 'ready', data: null });

    const first = transport.request(new Request('topCities')),
      second = transport.request(new Request('military'));

    worker.dispatchEvent({
      type: 'error',
      message: 'Uncaught Error: a rule',
      filename: 'backend.js',
    });

    expect(await settled(first)).to.equal('waiting');
    expect(await settled(second)).to.equal('waiting');
    // Passed on, which is not the worker saying anything: its silence is still timed.
    expect(timers.pending.size).to.equal(1);

    timers.runOut();

    expect(heard).to.deep.equal([
      { message: 'Uncaught Error: a rule' },
      { message: '', notAnswering: true },
    ]);

    worker.say({ channel: 'military', data: 'late', id: 2 });

    expect(await second).to.equal('late');
    expect(await settled(first)).to.equal('waiting');
  });

  it('leaves what waits waiting when a message from the worker can’t be read, which is not hearing from it', async (): Promise<void> => {
    const worker = new FakeWorker(),
      timers = new FakeTimers(),
      transport = transportFor(worker, { timers }),
      heard: WorkerError[] = [];

    transport.receive('workerError', (data) => heard.push(data));
    worker.say({ channel: 'ready', data: null });

    const asked = transport.request(new Request('topCities'));

    worker.dispatchEvent({ type: 'messageerror' });

    expect(await settled(asked)).to.equal('waiting');
    expect(heard).to.deep.equal([{ message: '' }]);

    timers.runOut();

    expect(heard).to.deep.equal([
      { message: '' },
      { message: '', notAnswering: true },
    ]);

    worker.say({ channel: 'topCities', data: ['Karakorum'], id: 1 });

    expect(await asked).to.deep.equal(['Karakorum']);
  });

  it('says once that a worker that has been ended has gone quiet, and rejects what waits on it when disposed of', async (): Promise<void> => {
    const worker = new FakeWorker(),
      timers = new FakeTimers(),
      transport = transportFor(worker, { timers }),
      heard: WorkerError[] = [],
      stopHearing = transport.receive('workerError', (data) =>
        heard.push(data)
      );

    worker.say({ channel: 'ready', data: null });

    const first = transport
        .request(new Request('topCities'))
        .catch((error) => error),
      second = transport
        .request(new Request('military'))
        .catch((error) => error);

    // Ended by the page, a worker says nothing at all: no event, no message.
    timers.runOut();
    timers.runOut();

    expect(heard).to.deep.equal([{ message: '', notAnswering: true }]);
    expect(await settled(first)).to.equal('waiting');

    // One asked after that waits, and is timed and reported in its turn.
    const third = transport
      .request(new Request('intelligence'))
      .catch((error) => error);

    timers.runOut();

    expect(heard).to.deep.equal([
      { message: '', notAnswering: true },
      { message: '', notAnswering: true },
    ]);

    transport.dispose();

    const errors = [await first, await second, await third];

    expect(errors.map((error) => error instanceof RequestFailed)).to.deep.equal(
      [true, true, true]
    );
    expect(errors.map(({ message }) => message)).to.deep.equal([
      disposedMessage,
      disposedMessage,
      disposedMessage,
    ]);
    expect(timers.pending.size).to.equal(0);

    // What was given to `receive` is stopped by what that returned, and nothing else is left listening.
    expect(listening(worker)).to.equal(1);

    stopHearing();

    expect(listening(worker)).to.equal(0);

    // Later requests fail at once, without being posted.
    const posted = worker.posted.length,
      after = await transport
        .request(new Request('topCities'))
        .catch((error) => error);

    expect(after.message).to.equal(disposedMessage);
    expect(worker.posted.length).to.equal(posted);
  });

  it('disposed of, hears no more of the worker’s errors', (): void => {
    const worker = new FakeWorker(),
      transport = transportFor(worker),
      heard: WorkerError[] = [];

    transport.receive('workerError', (data) => heard.push(data));
    transport.request(new Request('topCities')).catch(() => {});
    transport.dispose();

    worker.dispatchEvent({ type: 'error', message: 'Uncaught Error: late' });
    worker.dispatchEvent({ type: 'messageerror' });
    worker.dispatchEvent({ type: 'error' });

    expect(heard).to.deep.equal([]);
  });
});
