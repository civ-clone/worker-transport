import { ParentTransport } from '../ParentTransport';
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
