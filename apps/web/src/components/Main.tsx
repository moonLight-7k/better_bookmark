"use client";
import { useEffect, useState, useMemo, useRef, type JSX } from "react";
import Card from "./Card";
import VirtualizedView from "./VirtualizedView";
import { getGridColumns } from "@/utils/helper";
import LinkCardSkeleton from "./skeleton/CardSkeleton";
import ErrorDisplay from "./ErrorDisplay";
import { useInfiniteBookmarks } from "@/hooks/useApiQuery";
import { SearchResult } from "@/types/search";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function Main() {
  const [windowHeight, setWindowHeight] = useState(700);
  const { user } = useAuth();
  const observerTarget = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading: loading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: fetchBookmarks,
  } = useInfiniteBookmarks({
    userId: user?.uid,
    limit: 40,
    enabled: !!user,
  });

  // Determine error type from the error object
  const errorType = error
    ? error.message.includes("network") || error.message.includes("timeout")
      ? "network"
      : "other"
    : null;

  useEffect(() => {
    if (typeof window === "undefined") {
      console.error("Window object is not available.");
      return;
    }

    const updateWindowHeight = () => {
      setWindowHeight(window.innerHeight - 110);
    };

    updateWindowHeight();
    window.addEventListener("resize", updateWindowHeight);

    return () => {
      window.removeEventListener("resize", updateWindowHeight);
    };
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (!observerTarget.current || !scrollContainerRef.current) {
      console.log("Observer or container not ready", {
        observerTarget: !!observerTarget.current,
        scrollContainer: !!scrollContainerRef.current,
      });
      return;
    }

    console.log("Setting up IntersectionObserver", {
      hasNextPage,
      isFetchingNextPage,
    });

    const observer = new IntersectionObserver(
      (entries) => {
        console.log("Observer triggered", {
          isIntersecting: entries[0].isIntersecting,
          hasNextPage,
          isFetchingNextPage,
        });
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          console.log("✅ Fetching next page...");
          fetchNextPage();
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "200px",
        threshold: 0.1,
      }
    );

    const currentTarget = observerTarget.current;
    observer.observe(currentTarget);

    return () => {
      observer.unobserve(currentTarget);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten all pages into a single array
  const allBookmarks = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data]);

  // Memoize the loading indicator separately to prevent VirtualizedView re-renders
  const loadingIndicator = useMemo(
    () => (
      <div
        ref={observerTarget}
        className="h-20 w-full flex items-center justify-center"
        style={{ marginTop: "20px" }}
      >
        {isFetchingNextPage && (
          <div className="flex items-center gap-2 text-white">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading more...</span>
          </div>
        )}
        {!hasNextPage && allBookmarks.length > 0 && (
          <p className="text-gray-400 text-sm">No more bookmarks</p>
        )}
      </div>
    ),
    [isFetchingNextPage, hasNextPage, allBookmarks.length]
  );

  const cardList = useMemo((): JSX.Element | undefined => {
    if (!allBookmarks.length) return undefined;

    return (
      <VirtualizedView
        items={allBookmarks as SearchResult[]}
        itemHeight={200}
        windowHeight={windowHeight}
        layout="grid"
        gridColumns={getGridColumns()}
        className="w-fit h-screen"
        containerClassName="w-screen px-0 sm:px-0 lg:px-[15vw]"
        itemClassName="flex flex-grow justify-center items-center"
        scrollContainerRef={scrollContainerRef}
        observerTarget={loadingIndicator}
        renderItem={(data: SearchResult, index: number) => (
          <Card
            key={`card-${data.site || data.id}-${index}`}
            id={data.id}
            title={data.title}
            site={data.site}
            icon={data.icon!}
            clickCount={data.clickCount || 0}
            pinned={data.pinned || false}
            dateAdded={data.dateAdded}
            index={index}
          />
        )}
      />
    );
  }, [allBookmarks, windowHeight, loadingIndicator]);

  return (
    <div className="bg-[#323232] -mt-20 max-h-screen custom-">
      {error && !loading && (
        <ErrorDisplay
          error={error.message}
          errorType={errorType}
          onRetry={fetchBookmarks}
        />
      )}
      <div className="flex flex-wrap md:px-10 px-2 lg:px-32 items-center justify-center gap-5 mt-28 pb-10">
        {loading
          ? Array(26)
              .fill(0)
              .map((_, index) => <LinkCardSkeleton key={index} />)
          : cardList}
      </div>
    </div>
  );
}
