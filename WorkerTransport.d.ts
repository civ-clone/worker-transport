import {
  RequestId,
  TransportDataMap,
  TransportDisposer,
  TransportReceiveHandler,
  TransportSendArgs,
} from '@civ-clone/core-data-client/Transport';
import AbstractTransport, {
  AbstractTransportOptions,
  RequestFailed,
} from '@civ-clone/core-data-client/AbstractTransport';
import { Serialiser } from './serialise';
export declare const neverRanMessage = 'The worker could not be loaded.';
/** Something went wrong in the worker, or the page's own word that it has gone quiet while requests wait on it. */
export type WorkerError = {
  message: string;
  notAnswering?: boolean;
};
export type WorkerTransportOptions = AbstractTransportOptions & {
  /**
   * Channels whose data is handed over as it arrived, an `ObjectMap` and all, for a listener that rebuilds it itself:
   * every other channel's is rebuilt with `reconstituteData` first. civ.one's game data is one: its page rebuilds it
   * incrementally, so a rebuild here would be a second copy of several megabytes (civ-clone/web-renderer#333).
   */
  rawChannels?: Iterable<PropertyKey>;
  /**
   * The channel the worker's own uncaught errors, a request it could not answer and its silence are passed on to, as
   * `WorkerError`s, as though the worker had sent them. `workerError` unless given.
   */
  errorChannel?: PropertyKey;
  /**
   * What turns what it is given to send into what it posts: `serialiseDataObjects` unless given, which posts a
   * `DataObject` as its own `toPlainObject()`, with nothing filtered out (see there).
   */
  serialise?: Serialiser;
};
/**
 * The page's end of a transport over a web worker's messages.
 *
 * What it is given to send is posted as its `serialise` option makes it. Unless given one, a `DataObject` goes as its
 * `toPlainObject()`, everything it reaches as every player sees it: a caller that sends what one player may see
 * serialises it first, with its own registry and filter, or gives the transport a serialiser that does.
 */
export declare class WorkerTransport<
  DataMap extends TransportDataMap
> extends AbstractTransport<DataMap> {
  #private;
  constructor(
    worker: Worker,
    {
      rawChannels,
      errorChannel,
      serialise,
      ...options
    }?: WorkerTransportOptions
  );
  /**
   * Ends the transport's use: what it listens to on the worker is no longer listened to, each request still waiting is
   * rejected, and the silence is no longer timed. The worker is left running: ending it is for whoever started it.
   * What was given to `receive` and `receiveOnce` is stopped by what those returned.
   */
  dispose(): void;
  protected requestRejected(error: RequestFailed): void;
  protected notAnswering(): void;
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
export default WorkerTransport;
