import Image from "next/image";

export default function profile() {
  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className=" rounded-full  ">
        <div className="w-10 rounded-full">
          <Image
            width={20}
            height={20}
            alt="site_icon"
            src="https://daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg"
            className="rounded-full"
          />
        </div>
      </div>
      <ul
        tabIndex={0}
        className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-[#2f2f2f] rounded-box w-52"
      >
        <li>
          <a className="justify-between">
            Profile
            <span className="badge">New</span>
          </a>
        </li>
        <li>
          <a>Settings</a>
        </li>
        <li>
          <a>Logout</a>
        </li>
      </ul>
    </div>
  );
}
