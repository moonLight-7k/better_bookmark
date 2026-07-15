import Image from "next/image";
import Drawer from "./Drawer";

const Navbar = () => {
  return (
    <header className="sticky top-0  z-50 flex w-full items-center justify-between border-b border-solid border-neutral-700 bg-[#323232d1] px-4 py-2 backdrop-blur-[20px] max-md:flex-wrap sm:px-8 lg:px-16">
      <div className="shrink-0 flex flex-row items-center gap-2">
        <Image
          src={"/LogoFull.svg"}
          alt="Logo"
          width={192}
          height={56}
          className="h-14 max-sm:h-10 w-auto"
        />
        <span className="bg-orange-500/20 px-4 rounded-full text-orange-500">
          beta
        </span>
      </div>

      <div>
        <Drawer />
      </div>
    </header>
  );
};

export default Navbar;
