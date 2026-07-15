"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Command,
  Search,
  Sparkles,
  X,
  ArrowUpDown,
  AlertCircle,
  Clock,
  RotateCw,
  CornerDownLeft,
  HistoryIcon,
  Loader2,
} from "lucide-react";
import Card from "./Card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import VirtualizedView from "./VirtualizedView";
import LinkCardSkeleton from "./skeleton/CardSkeleton";
import { SearchResult as SearchResultType } from "@/types/search";
import { useInfiniteSearchBookmarks } from "@/hooks/useApiQuery";
import { useAuth } from "@/context/AuthContext";
import { getGridMetrics } from "@/utils/helper";

type SortOption = "relevance" | "clicks" | "title";
const RECENT_SEARCHES_KEY = "recentSearches";
const MAX_RECENT_SEARCHES = 5;

const GlobalSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const scrollObserverTarget = useRef<HTMLDivElement>(null);
  const [windowHeight, setWindowHeight] = useState(700);
  const [grid, setGrid] = useState({
    columns: 4,
    itemHeight: 202,
    gridWidth: 800,
  });
  const { user } = useAuth();

  const {
    data: searchData,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteSearchBookmarks({
    userId: user?.uid,
    query: debouncedQuery,
    limit: 24,
    enabled: debouncedQuery.length > 0,
  });

  // Flatten all pages into single array
  const results = useMemo(() => {
    if (!searchData?.pages) return null;
    return searchData.pages.flatMap((page) => page.results);
  }, [searchData]);

  const totalResults = searchData?.pages[0]?.totalResults || 0;

  useEffect(() => {
    if (!window) return;
    else {
      const storedSearches = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (storedSearches) {
        try {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate recent searches from localStorage on mount (SSR-safe)
          setRecentSearches(JSON.parse(storedSearches));
        } catch (e) {
          console.error("Failed to parse recent searches", e);
        }
      }

      const updateWindowHeight = () => {
        setWindowHeight(window.innerHeight - 320);
        setGrid(getGridMetrics());
      };

      updateWindowHeight();
      window.addEventListener("resize", updateWindowHeight);

      return () => {
        window.removeEventListener("resize", updateWindowHeight);
      };
    }
  }, []);

  const addToRecentSearches = useCallback((query: string) => {
    if (!query.trim()) return;

    setRecentSearches((prev) => {
      const newSearches = [query, ...prev.filter((s) => s !== query)].slice(
        0,
        MAX_RECENT_SEARCHES,
      );

      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newSearches));
      return newSearches;
    });
  }, []);

  // Optimized debouncing - 300ms instead of 500ms for better UX
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        setDebouncedQuery(searchQuery.trim());
      } else {
        setDebouncedQuery("");
      }
    }, 300); // Reduced from 500ms to 300ms

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Infinite scroll observer for search results
  useEffect(() => {
    if (!isOpen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    const currentTarget = scrollObserverTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [isOpen, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const sortedResults = useMemo(() => {
    if (!results) return [];

    const validResults = results
      .filter((r): r is Required<typeof r> => !!r.title && !!r.site)
      .map((r, index) => ({
        ...r,
        id: r.id || r.site || `bookmark-${index}`,
        title: r.title!,
        site: r.site!,
        dateAdded: r.dateAdded || new Date().toISOString(),
        clickCount: r.clickCount || 0,
        pinned: r.pinned || false,
        category: r.category || (r.tags as string[]) || [],
        tag: r.tag || (r.tags as string[]) || [],
      })) as SearchResultType[];

    return validResults.sort((a, b) => {
      switch (sortBy) {
        case "relevance":
          return (b.relevanceScore || 0) - (a.relevanceScore || 0);
        case "clicks":
          return (b.clickCount || 0) - (a.clickCount || 0);
        case "title":
          return (a.title || "").localeCompare(b.title || "");
        default:
          return 0;
      }
    });
  }, [results, sortBy]);

  const handleResultClick = useCallback(
    (url: string) => {
      if (searchQuery) {
        addToRecentSearches(searchQuery);
      }
      window.open(url, "_blank");
    },
    [searchQuery, addToRecentSearches],
  );

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "k") {
      event.preventDefault();
      setIsOpen((prev) => !prev);
    }
    if (event.key === "Escape") {
      setIsOpen(false);
    }
  }, []);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const sorted = sortedResults;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < sorted.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (
        e.key === "Enter" &&
        selectedIndex >= 0 &&
        sorted[selectedIndex] &&
        sorted[selectedIndex].site
      ) {
        e.preventDefault();
        handleResultClick(sorted[selectedIndex].site);
      }
    },
    [sortedResults, selectedIndex, handleResultClick],
  );

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset highlighted result when the search dialog opens
      setSelectedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedIndex >= 0 && resultsContainerRef.current) {
      const cards =
        resultsContainerRef.current.querySelectorAll(".result-card");
      if (cards[selectedIndex]) {
        cards[selectedIndex].scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [selectedIndex]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
    searchInputRef.current?.focus();
  }, []);

  const applyRecentSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const renderSkeletons = () => {
    return Array(8)
      .fill(0)
      .map((_, index) => <LinkCardSkeleton key={`skeleton-${index}`} />);
  };

  return (
    <div>
      {!isOpen && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                onClick={() => setIsOpen(true)}
                className="cursor-pointer fixed bottom-16 right-36 md:right-36 sm:right-10 max-sm:right-4 max-sm:bottom-4 rounded-full bg-orange gap-2 hover:scale-110 hover:shadow-xl transition-all ease-in-out w-fit px-2.5 max-sm:px-2 inline-flex h-12 max-sm:h-11 animate-shimmer items-center justify-center border-2 border-[#ff8f44] hover:border-[#F26B0F] bg-[linear-gradient(110deg,#F26B0F,45%,#FA812F,55%,#F26B0F)] bg-size-[200%_100%] font-medium text-white/90 focus:outline-hidden focus:ring-2 focus:ring-[#F96E2A] focus:ring-offset-2"
              >
                <Sparkles
                  size={26}
                  className="text-white/90 opacity-90 max-sm:w-5 max-sm:h-5"
                />
                <div className="flex flex-col items-start justify-start pr-2 max-sm:pr-1">
                  <span className="flex-col text-lg max-sm:text-base max-sm:flex">
                    {" "}
                    Search
                  </span>
                  <span className="flex max-sm:hidden text-sm items-center -mt-1.5 opacity-80">
                    <Command size={12} /> + K
                  </span>
                </div>
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="left"
              className="bg-[#424242] border border-gray-600 mb-1 max-sm:hidden"
            >
              <span className="flex text-[14px] items-center opacity-80">
                Search (<Command size={14} /> + K)
              </span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <Dialog modal open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[85vw] lg:max-w-[70vw] max-w-[95vw] max-h-[90vh] h-fit overflow-hidden bg-[#323232] border border-zinc-500 shadow-2xl transition-all duration-100 ease-in-out p-4 sm:p-6">
          <div className="relative text-white  h-12 max-h-12 border overflow-hidden rounded-lg focus-within:ring-1 focus-within:ring-[#F96E2A] focus-within:border-[#F96E2A] bg-[#3a3a3a] transition-transform duration-200">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-orange/70 group-focus-within:text-[#F96E2A] transition-colors max-sm:w-4 max-sm:h-4 max-sm:left-2" />
            <Input
              ref={searchInputRef}
              placeholder="Search with meaning - try describing content, concepts, or ideas..."
              className="pl-10 max-sm:pl-8 pr-24 max-sm:pr-12 border-transparent border-none h-12 max-h-12 hover:border-transparent focus:border-transparent focus:ring-0 bg-transparent text-white placeholder:text-gray-400 max-sm:text-sm max-sm:placeholder:text-xs"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0); // auto-select top result on new query
              }}
              onKeyDown={handleSearchKeyDown}
              aria-label="Semantic search for bookmarks"
              aria-autocomplete="list"
              autoComplete="on"
            />
            {/* Desktop: Enter button — opens the selected (top) result */}
            <button
              type="button"
              onClick={() => {
                const target = sortedResults[selectedIndex] || sortedResults[0];
                if (target?.site) handleResultClick(target.site);
              }}
              disabled={sortedResults.length === 0}
              aria-label="Open selected bookmark"
              className="absolute hidden sm:flex items-end gap-2 border border-[#F96E2A] right-2 top-1/2 -translate-y-1/2 rounded-md bg-linear-to-r from-[#F26B0F]/10 to-[#FA812F]/20 hover:from-[#F26B0F]/50 hover:to-[#FA812F] px-3 py-1 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-[#F26B0F]/10 disabled:hover:to-[#FA812F]/20"
            >
              <span className="font-mono text-xs font-medium">Enter</span>
              <CornerDownLeft size={14} color="white" />
            </button>
            {/* Mobile: Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute flex sm:hidden items-center justify-center right-2 top-1/2 -translate-y-1/2 rounded-md bg-linear-to-r from-[#F26B0F]/10 to-[#FA812F]/20 hover:from-[#F26B0F]/50 hover:to-[#FA812F] px-2 py-1 text-white transition-colors border border-[#F96E2A]"
              aria-label="Close search"
            >
              <X size={16} color="white" />
            </button>
          </div>

          {isLoading && (
            <div className="text-muted-foreground text-center mt-4 flex-col">
              <div className="flex flex-col items-center justify-center gap-2 mb-6">
                {/* <Loader2 className="mr-2 h-4 w-4 animate-spin" /> */}
                <span className="text-lg max-sm:text-base font-medium mt-2 px-2 text-center">
                  Searching for &quot;{searchQuery}&quot;
                </span>
                {/* <span className="text-sm text-gray-400">
                  Finding your bookmarks across all your content
                </span> */}
              </div>

              <div className="flex flex-wrap gap-3 max-sm:gap-2 justify-center">
                {renderSkeletons()}
              </div>
            </div>
          )}

          {error && (
            <div className="text-muted-foreground text-center mt-8 py-8 max-sm:mt-4 max-sm:py-4 flex flex-col items-center px-4">
              <div className="rounded-full bg-[#4A3030] p-5 max-sm:p-3 mb-4">
                <AlertCircle
                  size={36}
                  className="text-[#FF6B6B] max-sm:w-6 max-sm:h-6"
                />
              </div>
              <p className="text-lg max-sm:text-base font-medium text-white mb-3">
                Unable to complete search
              </p>
              <p className="text-sm max-sm:text-xs text-gray-300 mb-4 max-w-lg">
                We couldn&lsquo;t find what you&lsquo;re looking for. Please
                check your connection and try again.
              </p>
              <button
                onClick={() => setDebouncedQuery(searchQuery)}
                className="flex items-center gap-2 bg-[#444444] hover:bg-[#555555] text-white py-2 px-4 max-sm:py-1.5 max-sm:px-3 max-sm:text-sm rounded-md transition-colors"
              >
                <RotateCw size={16} className="max-sm:w-4 max-sm:h-4" />
                <span>Try again</span>
              </button>
            </div>
          )}

          {!isLoading && !error && searchQuery && results?.length === 0 && (
            <div className="text-muted-foreground text-center mt-12 max-sm:mt-6 py-8 max-sm:py-4 px-4">
              <div className="flex flex-col items-center justify-center">
                <div className="rounded-full bg-[#444444] p-5 max-sm:p-3 mb-4">
                  <Search
                    size={40}
                    className="opacity-50 max-sm:w-8 max-sm:h-8"
                  />
                </div>
                <p className="text-xl max-sm:text-lg font-medium mb-3 text-white">
                  No bookmarks found for &quot;{searchQuery}&quot;
                </p>
                <div className="max-w-md mx-auto space-y-4">
                  <p className="text-sm max-sm:text-xs opacity-80">
                    Try these search tips to find what you&lsquo;re looking for:
                  </p>
                  <ul className="text-sm max-sm:text-xs opacity-70 flex flex-col gap-2 items-start text-left mx-auto ml-12 max-sm:ml-8 w-fit">
                    <li className="flex gap-2">
                      <span className="text-[#F96E2A]">•</span> Check for
                      spelling mistakes
                    </li>
                    <li className="flex gap-2">
                      <span className="text-[#F96E2A]">•</span> Use fewer or
                      different keywords
                    </li>
                    <li className="flex gap-2">
                      <span className="text-[#F96E2A]">•</span> Try searching
                      with part of the website URL
                    </li>
                  </ul>
                </div>
                <button
                  onClick={clearSearch}
                  className="mt-6 max-sm:mt-4 flex items-center gap-2 bg-[#444444] hover:bg-[#555555] text-white py-2 px-4 max-sm:py-1.5 max-sm:px-3 max-sm:text-sm rounded-md transition-colors"
                >
                  <X size={14} className="max-sm:w-3 max-sm:h-3" />
                  <span>Clear search</span>
                </button>
              </div>
            </div>
          )}

          {!isLoading && !error && results?.length ? (
            <div className="mt-4 text-white flex flex-col items-start w-full">
              <div className="flex flex-col sm:flex-row justify-between w-full items-start sm:items-center mb-2 gap-2 sm:gap-0">
                <h3 className="text-sm font-medium text-gray-50/50">
                  Results{" "}
                  <span className="text-white">
                    ({totalResults || results.length})
                  </span>
                </h3>
                <div className="flex items-center gap-2 text-sm max-sm:text-xs w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-gray-400">Sort by:</span>
                  <div className="relative inline-block">
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value as SortOption);
                        setSelectedIndex(0);
                      }}
                      className="bg-[#444444] border border-gray-600 rounded px-2 py-1 pr-8 max-sm:pr-7 text-white max-sm:text-xs focus:outline-hidden cursor-pointer appearance-none"
                      aria-label="Sort results by"
                    >
                      <option value="relevance" className="bg-[#323232]">
                        Best Match
                      </option>
                      <option value="clicks" className="bg-[#323232]">
                        Most Visited
                      </option>
                      <option value="title" className="bg-[#323232]">
                        Alphabetical
                      </option>
                    </select>
                    <ArrowUpDown
                      size={14}
                      className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 max-sm:w-3 max-sm:h-3"
                    />
                  </div>
                </div>
              </div>
              <VirtualizedView
                items={sortedResults}
                itemHeight={grid.itemHeight}
                windowHeight={windowHeight}
                layout="grid"
                gridColumns={grid.columns}
                className="w-full px-0 h-fit sm:px-0 lg:px-2 custom-scrollbar"
                containerStyle={{
                  width: grid.gridWidth,
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
                itemClassName="flex justify-center items-center"
                renderItem={(data: SearchResultType, index: number) => (
                  <div
                    onClick={() =>
                      debouncedQuery && addToRecentSearches(debouncedQuery)
                    }
                    className={`result-card transition-all duration-200 transform ${
                      selectedIndex === index
                        ? "scale-[1.03] ring-2 ring-[#F96E2A] rounded-lg shadow-md shadow-[#F96E2A]/20"
                        : "hover:scale-[1.02] hover:ring-1 hover:ring-[#F96E2A]/70 hover:shadow-xs rounded-lg"
                    }`}
                  >
                    <Card
                      key={`card-${data.site}-${index}`}
                      rank={data.rank}
                      title={data.title}
                      site={data.site}
                      icon={data.icon!}
                    />
                  </div>
                )}
              />

              {/* Infinite scroll trigger */}
              <div
                ref={scrollObserverTarget}
                className="w-full flex items-center justify-center py-4"
              >
                {isFetchingNextPage && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Loading more results...</span>
                  </div>
                )}
                {!hasNextPage && results.length > 24 && (
                  <p className="text-gray-400 text-xs">All results loaded</p>
                )}
              </div>
            </div>
          ) : !searchQuery && !isLoading ? (
            <div className="text-center text-muted-foreground flex flex-col items-center py-3 px-4">
              {recentSearches.length > 0 && (
                <div className="w-full mb-6 max-sm:mb-4">
                  <h3 className="text-sm max-sm:text-xs font-medium text-gray-300 mb-2 flex items-center gap-1.5">
                    <Clock size={15} className="max-sm:w-4 max-sm:h-4" />
                    Recent searches
                  </h3>
                  <div className="flex flex-wrap gap-2 max-sm:gap-1.5 justify-start">
                    {recentSearches.map((query, idx) => (
                      <button
                        key={idx}
                        className="px-2.5 py-1 max-sm:px-2 max-sm:py-0.5 font-mono bg-[#444444] hover:bg-[#555555] rounded-full text-sm max-sm:text-xs text-white/80 transition-colors duration-200 flex items-center gap-1.5 hover:text-white"
                        onClick={() => applyRecentSearch(query)}
                        aria-label={`Search again for ${query}`}
                      >
                        <HistoryIcon
                          size={13}
                          color="gray"
                          className="max-sm:w-3 max-sm:h-3"
                        />
                        {query}
                      </button>
                    ))}
                  </div>
                  {recentSearches.length >= 2 && (
                    <div className="mt-2 text-xs max-sm:text-[10px] text-gray-400 flex items-center gap-1">
                      <span>Click any item to search again</span>
                    </div>
                  )}
                </div>
              )}
              <div className="mb-6 max-sm:mb-4 flex flex-col items-center">
                <Search
                  size={48}
                  className="text-orange/70 mb-3 max-sm:w-10 max-sm:h-10"
                />
                <h3 className="text-xl max-sm:text-lg font-semibold text-white mb-2">
                  Search your bookmarks
                </h3>
                <p className="text-sm max-sm:text-xs text-gray-400 max-w-md">
                  Type to search across your bookmarked sites by title, URL, or
                  content
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-sm:gap-2 max-w-lg mx-auto mt-4 max-sm:mt-2 w-full">
                <div className="bg-[#3a3a3a] p-4 max-sm:p-3 rounded-lg flex flex-col items-center text-center">
                  <ArrowUpDown
                    size={20}
                    className="text-orange mb-2 max-sm:w-4 max-sm:h-4 max-sm:mb-1"
                  />
                  <h4 className="font-medium text-white/90 mb-1 max-sm:text-xs max-sm:mb-0.5">
                    Sort Results
                  </h4>
                  <p className="text-xs max-sm:text-[10px] text-gray-400">
                    By relevance, clicks or title
                  </p>
                </div>
                <div className="bg-[#3a3a3a] p-4 max-sm:p-3 rounded-lg flex flex-col items-center text-center">
                  <Command
                    size={20}
                    className="text-orange mb-2 max-sm:w-4 max-sm:h-4 max-sm:mb-1"
                  />
                  <h4 className="font-medium text-white/90 mb-1 max-sm:text-xs max-sm:mb-0.5">
                    Keyboard Navigation
                  </h4>
                  <p className="text-xs max-sm:text-[10px] text-gray-400">
                    Use arrows to select results
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="text-xs flex flex-col md:flex-row justify-between mt-4 border-t border-gray-700 pt-3 bg-[#383838] rounded-md p-2 gap-2 md:gap-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 max-sm:w-full">
              <div className="flex items-center max-sm:text-[10px]">
                <div className="flex gap-1 mr-1.5">
                  <kbd className="px-2 py-1 max-sm:px-1.5 max-sm:py-0.5 bg-[#444] text-white/70 border border-gray-600 rounded shadow-xs hover:bg-[#555] transition-colors text-xs max-sm:text-[10px]">
                    ↑
                  </kbd>
                  <kbd className="px-2 py-1 max-sm:px-1.5 max-sm:py-0.5 bg-[#444] text-white/70 border border-gray-600 rounded shadow-xs hover:bg-[#555] transition-colors text-xs max-sm:text-[10px]">
                    ↓
                  </kbd>
                </div>
                <span className="text-gray-300 max-sm:text-[10px]">
                  Navigate results
                </span>
              </div>

              <div className="flex items-center max-sm:text-[10px]">
                <kbd className="px-2 py-1 max-sm:px-1.5 max-sm:py-0.5 text-white/70 bg-[#444] border border-gray-600 rounded shadow-xs mr-1.5 hover:bg-[#555] transition-colors text-xs max-sm:text-[10px]">
                  Enter
                </kbd>
                <span className="text-gray-300 max-sm:text-[10px]">
                  Open selected bookmark
                </span>
              </div>

              <div className="flex items-center max-sm:text-[10px]">
                <kbd className="px-2 py-1 max-sm:px-1.5 max-sm:py-0.5 text-white/70 bg-[#444] border border-gray-600 rounded shadow-xs mr-1.5 hover:bg-[#555] transition-colors text-xs max-sm:text-[10px]">
                  Esc
                </kbd>
                <span className="text-gray-300 max-sm:text-[10px]">
                  Close search
                </span>
              </div>
            </div>

            <div className="flex items-center text-gray-400 opacity-90 gap-1 max-sm:text-[10px] max-sm:justify-center md:hidden lg:flex">
              <Command
                size={12}
                color="gray"
                className="max-sm:w-3 max-sm:h-3"
              />
              <span>+</span>
              <kbd className="px-1.5 py-0.5 max-sm:px-1 bg-[#444] border border-gray-600 rounded hover:bg-[#555] transition-colors text-xs max-sm:text-[10px]">
                K
              </kbd>
              <span className="ml-1">Toggle search anytime</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GlobalSearch;
