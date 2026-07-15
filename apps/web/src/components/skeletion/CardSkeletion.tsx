const LinkCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col justify-between p-4 rounded-xl border-2 border-[#ffffff12] h-[182px] w-[180px] max-sm:h-[154px] max-sm:w-[142px] bg-[#424242] animate-pulse">
      <div className="flex flex-col items-start w-full gap-2 mt-4 max-sm:mt-2">
        <div className="w-8 h-8 max-sm:w-6 max-sm:h-6 rounded-[8px] bg-[#ffffff1a]" />
        <div className="flex flex-col w-full gap-1">
          <div className="h-4 bg-[#ffffff1a] rounded w-3/4" />
          <div className="h-3 bg-[#ffffff1a] rounded w-full opacity-50" />
        </div>
      </div>

      <div className="h-3 bg-[#ffffff1a] rounded w-1/2 self-center mt-4" />
    </div>
  );
};

export default LinkCardSkeleton;
