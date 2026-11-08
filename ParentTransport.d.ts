import {
  RequestId,
  TransportDataMap,
  TransportDisposer,
  TransportMessage,
  TransportReceiveHandler,
  TransportSendArgs,
} from '@civ-clone/core-data-client/Transport';
import AbstractTransport from '@civ-clone/core-data-client/AbstractTransport';
export type TransportEventListenerArg<
  DataMap extends TransportDataMap = TransportDataMap
> = {
  data: TransportMessage<DataMap>;
};
/** The worker's end of a transport over its messages, to the page that started it. */
export declare class ParentTransport<
  DataMap extends TransportDataMap
> extends AbstractTransport<DataMap> {
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
