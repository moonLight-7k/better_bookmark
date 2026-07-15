// import Card from "./Card";
import Image from "next/image";

// type Bookmark = {
//   index: number;
//   site: string;
//   clickCount: number;
//   pinned: boolean;
//   category: never[];
//   tag?: never[];
// };

export default function Pinned() {
  return (
    <div className="flex flex-col pt-[98px]">
      {/* Header Section */}
      <div className="flex gap-2 ml-12 z-1">
        <Image src={"/pin.svg"} alt="Pinned Icon" width={16} height={16} />
        <p className="text-[24px] text-[#ffffff83] z-1">Pinned Bookmarks</p>
      </div>

      {/* Bookmarks Section */}
      <div
        className="flex lg:gap-6 lg:justify-center overflow-scroll scrollbar-hide pb-10 pt-10"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {/* {[]
          .filter((bookmark: Bookmark) => bookmark.pinned)
          .map((bookmark: Bookmark, index: number) => (
            <Card
              key={index}
              link={bookmark.site}
              count={bookmark.clickCount}
            />
          ))} */}
      </div>
    </div>
  );
}
