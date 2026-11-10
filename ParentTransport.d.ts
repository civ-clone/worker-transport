import {
  RequestId,
  TransportDataMap,
  TransportDisposer,
  TransportMessage,
  TransportReceiveHandler,
  TransportSendArgs,
} from '@civ-clone/core-data-client/Transport';
import AbstractTransport, {
  AbstractTransportOptions,
} from '@civ-clone/core-data-client/AbstractTransport';
import { Serialiser } from './serialise';
export type TransportEventListenerArg<
  DataMap extends TransportDataMap = TransportDataMap
> = {
  data: TransportMessage<DataMap>;
};
export type ParentTransportOptions = AbstractTransportOptions & {
  /**
   * What turns what it is given to send into what it posts: `serialiseDataObjects` unless given, which posts a
   * `DataObject` as its own `toPlainObject()`, with nothing filtered out (see there).
   */
  serialise?: Serialiser;
};
/**
 * The worker's end of a transport over its messages, to the page that started it.
 *
 * What it asks the page is a choice put to a person, who may take any time over it, so the page's silence is never
 * timed (civ-clone/web-renderer#871) unless a `silenceTimeout` is given. Every message from the page is heard as the
 * page still being there, which only matters to one that times it.
 *
 * What it is given to send is posted as its `serialise` option makes it. Unless given one, a `DataObject` goes as its
 * `toPlainObject()`, everything it reaches as every player sees it: a caller that sends what one player may see
 * serialises it first, with its own registry and filter, or gives the transport a serialiser that does.
 */
export declare class ParentTransport<
  DataMap extends TransportDataMap
> extends AbstractTransport<DataMap> {
  #private;
  constructor({ serialise, ...options }?: ParentTransportOptions);
  /** Stops hearing the page, rejects each request still waiting and removes the reply listeners. */
  dispose(): void;
  receive<Channel extends keyof DataMap>(
    channel: Channel,
    handler: TransportReceiveHandler<DataMap[Channel]>
  ): TransportDisposer;
  receiveOnce<Channel extends keyof DataMap>(
    channel: Channel,
    handler: TransportReceiveHandler<DataMap[Channel]>
  ): TransportDisposer;
  protected post<Channel extends keyof DataMap>(
    channel: Channel,
    data: TransportSendArgs<DataMap[Channel]>,
    id?: RequestId
  ): void;
}
export default ParentTransport;
