import { useState, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { MoveUpRight, Pin } from "lucide-react";

interface BookmarkProps {
  id?: string;
  title?: string;
  site?: string;
  icon?: string;
  clickCount?: number;
  dateAdded?: string | number; // Updated to accept both string and number
  pinned?: boolean;
  description?: string;
  rank?: number;
  index?: number;
  relevanceScore?: number;
}

const RELEVANCE_THRESHOLD = 0.7; // Adjust based on your requirements

const LinkCard: React.FC<BookmarkProps> = ({
  id,
  title,
  site,
  icon,
  clickCount = 0,
  pinned = false,
  relevanceScore,
  index = 0,
}) => {
  const [imageError, setImageError] = useState(false);

  // Use site or id as the link
  const link = site || id || "";

  // Extract domain from link
  const domain = (() => {
    try {
      const url = new URL(link);
      return url.hostname.replace(/^www\./, "");
    } catch (e) {
      console.log(e);
      return "unknown";
    }
  })();

  // Format the date added in a more user-friendly way, handling Unix timestamp format
  // const formattedDate = dateAdded
  //   ? (() => {
  //       // Handle Unix timestamp (as number or string)
  //       let date;
  //       if (typeof dateAdded === "number") {
  //         date = new Date(dateAdded * 1000); // Unix timestamp is in seconds, JS Date needs milliseconds
  //       } else if (!isNaN(Number(dateAdded))) {
  //         date = new Date(Number(dateAdded) * 1000); // Convert string to number first
  //       } else {
  //         date = new Date(dateAdded); // Handle regular date string
  //       }
  //       return date.toLocaleDateString();
  //     })()
  //   : "";

  return (
    <Link
      href={link}
      target="_blank"
      rel="noreferrer noopener"
      className={`flex flex-col justify-between p-4 rounded-xl border-2 border-solid bg-[#424242] ${
        relevanceScore && relevanceScore > RELEVANCE_THRESHOLD
          ? "border-orange-400"
          : "border-[#ffffff12] "
      } h-[182px] w-[180px] max-sm:h-[154px] max-sm:w-[142px] hover:shadow-xl hover:shadow-[#020202b0] duration-200 hover:scale-[103%] cursor-pointer hover:border-[#ffffff3c] text-[#ffffffaf] hover:text-[#fcfcfcee] relative`}
    >
      {/* Display pin icon if pinned */}
      {pinned && (
        <Pin
          size={18}
          className="absolute top-3 left-3 text-orange-400"
          aria-label="Pinned bookmark"
        />
      )}

      <MoveUpRight
        size={22}
        opacity={0.4}
        className="border rounded-full p-0.5 absolute top-3 right-3 border-[#ffffff40] hover:border-[#ffffff3c] hover:bg-[#ffffff12] hover:scale-110 duration-200 opacity-70"
        aria-hidden="true"
        color="#ffffff40"
      />

      <div className="flex flex-col items-start w-full gap-2 mt-4 max-sm:mt-2 ">
        <Image
          {...(index < 12 ? { priority: true } : { loading: "lazy" as const })}
          src={
            imageError
              ? icon && icon.startsWith("data:")
                ? icon
                : "/default.svg"
              : `https://www.google.com/s2/favicons?domain=${link}&sz=128`
          }
          alt={`${title || domain} favicon`}
          width={1000}
          height={1000}
          className="w-8 h-8 max-sm:w-6 max-sm:h-6 rounded-[8px] hover:scale-110 duration-200 opacity-90"
          onError={() => {
            setImageError(true);
          }}
        />

        <div className="flex flex-col items-start w-full">
          <p className="font-medium text-lg max-sm:text-md truncate w-full">
            {domain}
          </p>
          <p className="text-[12px] max-sm:text-[9px] text-[#ffffff] text-opacity-40 truncate w-full">
            {link}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center text-xs">
        <p className="text-neutral-500">{`Visited ${clickCount} times`}</p>
        {/* {dateAdded && (
          <p className="text-neutral-400 flex items-center gap-1 mt-1">
            <Clock size={12} className="inline" />
            <span> {formattedDate}</span>
          </p>
        )} */}
      </div>
    </Link>
  );
};

export default memo(LinkCard, (prevProps, nextProps) => {
  // Custom comparison for optimal re-render prevention
  return (
    prevProps.id === nextProps.id &&
    prevProps.clickCount === nextProps.clickCount &&
    prevProps.pinned === nextProps.pinned &&
    prevProps.relevanceScore === nextProps.relevanceScore &&
    prevProps.index === nextProps.index
  );
});
