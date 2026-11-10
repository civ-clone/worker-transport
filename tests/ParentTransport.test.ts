import { ParentTransport } from '../ParentTransport';
import { Request } from '@civ-clone/core-data-client/Request';
import {
  disposedMessage,
  startingSilenceFactor,
} from '@civ-clone/core-data-client/AbstractTransport';
import { expect } from 'chai';

type Listener = (event: any) => void;

// The worker's own global scope, which the test speaks for.
const scope = globalThis as any,
  listeners: Listener[] = [],
  posted: any[] = [];

before((): void => {
  scope.addEventListener = (type: string, listener: Listener) =>
    type === 'message' && listeners.push(listener);
  scope.removeEventListener = (type: string, listener: Listener) =>
    listeners.splice(listeners.indexOf(listener), 1);
  scope.postMessage = (message: any) => posted.push(message);
});

after((): void => {
  delete scope.addEventListener;
  delete scope.removeEventListener;
  delete scope.postMessage;
});

beforeEach((): void => {
  listeners.splice(0);
  posted.splice(0);
});

// A message from the page.
const say = (data: any): void =>
  [...listeners].forEach((listener) => listener({ data }));

describe('ParentTransport', (): void => {
  it('hands a listener its channel’s data, with the request id it came with', (): void => {
    const transport = new ParentTransport<any>(),
      heard: any[] = [];

    transport.receive('topCities', (data, meta) => heard.push([data, meta]));

    say({ channel: 'other', data: 1 });
    say({ channel: 'topCities', data: 5, id: 3 });

    expect(heard).to.deep.equal([[5, { id: 3 }]]);
  });

  it('hears a channel once with receiveOnce, and not at all once disposed', (): void => {
    const transport = new ParentTransport<any>(),
      once: any[] = [],
      never: any[] = [];

    transport.receiveOnce('start', (data) => once.push(data));
    transport.receive('start', (data) => never.push(data))();

    say({ channel: 'start', data: 1 });
    say({ channel: 'start', data: 2 });

    expect(once).to.deep.equal([1]);
    expect(never).to.deep.equal([]);
  });

  it('never times the page’s silence, which is a person choosing, unless told how long', (): void => {
    const set: number[] = [],
      timers = {
        set: (_: () => void, timeout: number): unknown => set.push(timeout),
        clear: (): void => {},
      };

    new ParentTransport<any>({ timers }).request(new Request('chooseFromList'));
    // A setting that was never set, passed straight on.
    new ParentTransport<any>({ timers, silenceTimeout: undefined }).request(
      new Request('chooseFromList')
    );

    expect(set).to.deep.equal([]);

    const timed = new ParentTransport<any>({ timers, silenceTimeout: 1_000 });

    timed.request(new Request('chooseFromList'));

    // A side that has yet to be heard from is given longer.
    expect(set).to.deep.equal([1_000 * startingSilenceFactor]);

    // Any message from the page says it is there: timed afresh, and for the usual time from then on.
    say({ channel: 'anything', data: null });

    expect(set).to.deep.equal([1_000 * startingSilenceFactor, 1_000]);
  });

  it('disposed of, listens to nothing and rejects what waits', async (): Promise<void> => {
    const transport = new ParentTransport<any>(),
      asked = transport
        .request(new Request('chooseFromList'))
        .catch((error) => error);

    // Its own, the request's replies and `requestFailed`.
    expect(listeners.length).to.equal(3);

    transport.dispose();

    expect(listeners.length).to.equal(0);
    expect((await asked).message).to.equal(disposedMessage);
  });

  it('replies with the id of the request it answers, and sends without one otherwise', (): void => {
    const transport = new ParentTransport<any>();

    transport.reply('topCities', ['Karakorum'], 3);
    transport.send('ready', null);

    expect(posted).to.deep.equal([
      { channel: 'topCities', data: ['Karakorum'], id: 3 },
      { channel: 'ready', data: null },
    ]);
  });
});
