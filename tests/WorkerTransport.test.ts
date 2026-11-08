import { WorkerError, WorkerTransport } from '../WorkerTransport';
import { Request } from '@civ-clone/core-data-client/Request';
import { expect } from 'chai';

type Listener = (event: any) => void;

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

const objectMap = {
    hierarchy: { '#ref': 'city-1' },
    objects: { 'city-1': { id: 'city-1', name: 'Karakorum' } },
  },
  transportFor = (worker: FakeWorker, options = {}) =>
    new WorkerTransport<any>(worker as unknown as Worker, options);

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
});
