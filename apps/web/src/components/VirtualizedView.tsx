import { SearchResult } from "@/types/search";
import { useState, useRef, useCallback, useEffect } from "react";
import { twMerge } from "tailwind-merge";

interface VirtualizedComponentProps {
  items: SearchResult[];
  itemHeight: number;
  windowHeight: number;
  layout?: "list" | "grid";
  gridColumns?: number;
  renderItem: (item: SearchResult, index: number) => React.ReactNode;
  className?: string;
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
  itemClassName?: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  observerTarget?: React.ReactNode;
}

const VirtualizedView = ({
  items = [],
  itemHeight = 50,
  windowHeight = 400,
  layout = "list",
  gridColumns = 3,
  renderItem,
  className = "",
  containerClassName = "",
  containerStyle,
  itemClassName = "",
  scrollContainerRef,
  observerTarget,
}: VirtualizedComponentProps) => {
  const [scrollTop, setScrollTop] = useState(0);
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = scrollContainerRef || internalRef;

  const itemsPerRow = layout === "grid" ? gridColumns : 1;
  const rowCount = Math.ceil(items.length / itemsPerRow);
  const totalHeight = rowCount * itemHeight;
  const visibleRowCount = Math.ceil(windowHeight / itemHeight);

  const startRowIndex = Math.floor(scrollTop / itemHeight);
  const endRowIndex = Math.min(startRowIndex + visibleRowCount + 1, rowCount);

  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

  useEffect(() => {
    const containerElement = containerRef.current;
    if (containerElement) {
      containerElement.addEventListener("scroll", handleScroll);
      return () => {
        containerElement.removeEventListener("scroll", handleScroll);
      };
    }
  }, [handleScroll, containerRef]);

  const renderItems = () => {
    const visibleItems = [];

    for (let rowIndex = startRowIndex; rowIndex < endRowIndex; rowIndex++) {
      if (layout === "list") {
        const itemIndex = rowIndex;
        if (itemIndex >= items.length) continue;

        const itemStyle = {
          position: "absolute",
          top: `${rowIndex * itemHeight}px`,
          height: `${itemHeight}px`,
          left: 0,
          right: 0,
        } as React.CSSProperties;

        visibleItems.push(
          <div key={itemIndex} style={itemStyle} className={itemClassName}>
            {renderItem(items[itemIndex], itemIndex)}
          </div>
        );
      } else if (layout === "grid") {
        for (let col = 0; col < itemsPerRow; col++) {
          const itemIndex = rowIndex * itemsPerRow + col;
          if (itemIndex >= items.length) continue;

          const itemStyle = {
            position: "absolute",
            top: `${rowIndex * itemHeight}px`,
            height: `${itemHeight}px`,
            left: `${(col / itemsPerRow) * 100}%`,
            width: `${(1 / itemsPerRow) * 100}%`,
          } as React.CSSProperties;

          visibleItems.push(
            <div key={itemIndex} style={itemStyle} className={itemClassName}>
              {renderItem(items[itemIndex], itemIndex)}
            </div>
          );
        }
      }
    }

    return visibleItems;
  };

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className={twMerge(
          " overflow-y-auto hide-scrollbar",
          containerClassName
        )}
        style={{
          height: `${windowHeight}px`,
          ...containerStyle,
        }}
      >
        <div className="relative" style={{ height: `${totalHeight}px` }}>
          {renderItems()}
          {/* Observer target for infinite scroll - positioned at the end of content */}
          <div
            style={{
              position: "absolute",
              top: `${totalHeight}px`,
              width: "100%",
            }}
          >
            {observerTarget}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualizedView;
