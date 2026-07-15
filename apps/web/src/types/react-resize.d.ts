declare module "react-window-infinite-loader" {
  import * as React from "react";

  interface InfiniteLoaderProps {
    isItemLoaded: (index: number) => boolean;
    itemCount: number;
    loadMoreItems: (startIndex: number, stopIndex: number) => Promise<unknown>;
    children: ({
      onItemsRendered,
      ref,
    }: {
      onItemsRendered: (params: {
        overscanStartIndex: number;
        overscanStopIndex: number;
        visibleStartIndex: number;
        visibleStopIndex: number;
      }) => void;
      ref: React.Ref<unknown>;
    }) => React.ReactNode;
  }

  export default class InfiniteLoader extends React.Component<InfiniteLoaderProps> {}
}
