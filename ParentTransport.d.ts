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
export type TransportEventListenerArg<
  DataMap extends TransportDataMap = TransportDataMap
> = {
  data: TransportMessage<DataMap>;
};
/**
 * The worker's end of a transport over its messages, to the page that started it.
 *
 * What it asks the page is a choice put to a person, who may take any time over it, so the page's silence is never
 * timed (civ-clone/web-renderer#871) unless a `silenceTimeout` is given. Every message from the page is heard as the
 * page still being there, which only matters to one that times it.
 */
export declare class ParentTransport<
  DataMap extends TransportDataMap
> extends AbstractTransport<DataMap> {
  #private;
  constructor(options?: AbstractTransportOptions);
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
