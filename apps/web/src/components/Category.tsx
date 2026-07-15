"use client";
import { useEffect } from "react";
import { useBookmarks } from "@/hooks/useApiQuery";
import { useUserDetails } from "@/hooks/useUserDetails";
// import Card from "./Card";

// interface CategoryType {
//   name: string;
//   active: boolean;
// }

// const initialCategories: CategoryType[] = [
//   { name: "All", active: true },
//   { name: "Recent", active: false },
// ];

export default function Category() {
  const { userDetails } = useUserDetails();
  const { data: bookmarks, error } = useBookmarks({
    userId: userDetails?.uid,
    enabled: !!userDetails?.uid,
  });

  // const [categories, setCategories] =
  //   useState<CategoryType[]>(initialCategories);
  // const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    if (bookmarks) {
      console.log("Bookmarks data:", bookmarks); // Log when bookmarks change
    }
  }, [bookmarks]);

  useEffect(() => {
    if (error) {
      console.error("Error fetching bookmarks:", error);
    }
  }, [error]);

  // function getCategoriesFromLocalStorage(): CategoryType[] {
  //   const savedCategories = localStorage.getItem("categories");
  //   return savedCategories ? JSON.parse(savedCategories) : initialCategories;
  // }

  // function saveCategoriesToLocalStorage(categories: CategoryType[]) {
  //   localStorage.setItem("categories", JSON.stringify(categories));
  // }

  // const handleCategoryClick = (index: number) => {
  //   const updatedCategories = categories?.map((category, i) => ({
  //     ...category,
  //     active: i === index,
  //   }));
  //   setCategories(updatedCategories);
  // };

  // const handleCreateCategory = (e: React.FormEvent<HTMLFormElement>) => {
  //   e.preventDefault();
  //   if (newCategoryName.trim()) {
  //     const newCategories = [
  //       ...categories!,
  //       { name: newCategoryName.trim(), active: false },
  //     ];
  //     setCategories(newCategories);
  //     saveCategoriesToLocalStorage(newCategories);
  //     setNewCategoryName("");
  //     (document.getElementById("addCategory") as HTMLDialogElement).close();
  //   }
  // };

  return (
    <div className=" bg-[#323232] h-full  custom-scrollbar">
      {/* <div className="flex gap-2 ml-12 mt-5 z-1">
        <Image src="/Category.svg" alt="Category" width={24} height={24} />
        <p className="text-[24px] text-[#ffffff83] z-1">Category</p>
      </div> */}

      {/* <div
        className="flex gap-2 overflow-scroll scroll-smooth ml-12 mt-8"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {categories?.map((category, index) => (
          <button
            key={index}
            className={`text-nowrap text-[18px] py-1 px-4 duration-200 rounded-xl border-2 ${
              category.active
                ? "bg-[#FF5E1A] border-2 border-[#ff986c] text-white"
                : "bg-[#424242] text-[#ffffff98] border-[#6f6f6faf] duration-300 hover:scale-[97%]"
            }`}
            onClick={() => handleCategoryClick(index)}
          >
            {category.name}
          </button>
        ))}

        <button
          className="tooltip hover:tooltip-open flex text-[18px] text-[#ffffffa2] hover:text-white px-2 bg-[#424242] duration-200 rounded-xl border-2 border-[#6F6F6F] hover:bg-[#FF5E1A] hover:border-2 hover:border-[#ff9161]"
          data-tip="Add Category"
          onClick={() =>
            (
              document.getElementById("addCategory") as HTMLDialogElement
            ).showModal()
          }
        >
          <span className="flex mt-1 gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1.2em"
              className="mt-[2px]"
              height="1.2em"
              viewBox="0 0 512 512"
            >
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="square"
                strokeLinejoin="round"
                strokeWidth={44}
                d="M256 112v288m144-144H112"
              />
            </svg>
          </span>
        </button>

        <dialog
          id="addCategory"
          className="modal p-4 rounded-md bg-[#3232320f] backdrop-blur-xs duration-100"
        >
          <div className="modal-box bg-[#323232] border border-[#ffffff2a] drop-shadow-xl duration-300">
            <p className="p-6 text-2xl text-white text-center">
              Create Category!
            </p>
            <div className="modal-action flex justify-center mt-8">
              <form
                className="flex flex-col gap-8 mx-10 mb-10"
                onSubmit={handleCreateCategory}
              >
                <div className="flex flex-col justify-center w-80 gap-4">
                  <div>
                    <label htmlFor="category" className="text-white">
                      Name*
                    </label>
                    <input
                      type="text"
                      placeholder="Type here..."
                      className="text-white input input-bordered w-full max-w-xs p-2 bg-[#424242] rounded-md border focus:border-[#9d9d9d9c]"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <button
                    type="submit"
                    className="text-white p-2 px-4 rounded-lg bg-[#fa6323] hover:shadow-lg hover:shadow-[#00000090] duration-300 border-2 border-[#fff0] hover:border-[#ff986c]"
                  >
                    Create Category
                  </button>
                  <button
                    type="button"
                    className="text-white p-2 px-4 rounded-lg bg-[#45454568] border-2 hover:border-[#ffffff3f] duration-300"
                    onClick={() =>
                      (
                        document.getElementById(
                          "addCategory"
                        ) as HTMLDialogElement
                      ).close()
                    }
                  >
                    Esc
                  </button>
                </div>
              </form>
            </div>
          </div>
        </dialog>
      </div> */}

      {/* <div className="flex flex-wrap lg:gap-6 md:gap-4 sm:gap-2  justify-center overflow-hidden pb-10 px-12 pt-28">
        {isLoading && <p className="text-white">Loading bookmarks...</p>}
        {bookmarks?.map((bookmark, index) => (
          <Card key={bookmark.id || index} link={bookmark.site} count={bookmark.clickCount} />
        ))}
      </div> */}
    </div>
  );
}
