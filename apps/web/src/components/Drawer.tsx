"use client";
import React, { ChangeEvent, FormEvent, useState, useEffect } from "react";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "./ui/dialog";
import { LucideEqual, LucideFileDown, LogOut, Plus, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useUploadBookmarks, useAddBookmark } from "@/hooks/useApiQuery";

type Status = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
};

export default function Drawer(): React.ReactElement {
  const { signOut, user } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = React.useState<boolean>(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState<boolean>(false);
  const [isAddBookmarkDialogOpen, setIsAddBookmarkDialogOpen] =
    useState<boolean>(false);
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<Status>({
    type: "idle",
    message: "",
  });

  const [link, setLink] = useState<string>("");
  const [addBookmarkStatus, setAddBookmarkStatus] = useState<Status>({
    type: "idle",
    message: "",
  });

  // TanStack Query mutations
  const uploadMutation = useUploadBookmarks();
  const addBookmarkMutation = useAddBookmark();

  useEffect(() => {
    if (isImportDialogOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form fields when the import dialog opens
      setFile(null);
      setImportStatus({ type: "idle", message: "" });
    }
  }, [isImportDialogOpen]);

  useEffect(() => {
    if (isAddBookmarkDialogOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form fields when the add-bookmark dialog opens
      setLink("");
      setAddBookmarkStatus({ type: "idle", message: "" });
    }
  }, [isAddBookmarkDialogOpen]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setImportStatus({ type: "idle", message: "" });
    const uploadedFile = event.target.files?.[0] || null;
    setFile(uploadedFile);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    if (!file || importStatus.type === "loading" || !user?.uid) {
      return;
    }

    setImportStatus({ type: "loading", message: "Preparing file..." });

    try {
      await uploadMutation.mutateAsync({
        file,
        userId: user.uid,
        compress: true, // Compress file before upload
        onProgress: (progress) => {
          setImportStatus({
            type: "loading",
            message: `Uploading: ${progress}%`,
          });
        },
      });

      setImportStatus({
        type: "success",
        message: "File uploaded successfully!",
      });
      setTimeout(() => {
        setIsImportDialogOpen(false);
      }, 1500);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";

      setImportStatus({
        type: "error",
        message: `Upload failed. ${errorMessage}`,
      });
      console.error("Error uploading file:", error);
    } finally {
      setIsDrawerOpen(false);
    }
  };

  const handleAddBookmarkSubmit = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    if (addBookmarkStatus.type === "loading" || !link || !user?.uid) {
      return;
    }

    setAddBookmarkStatus({ type: "loading", message: "Adding bookmark..." });

    try {
      await addBookmarkMutation.mutateAsync({
        link: link,
        userId: user.uid,
      });

      setAddBookmarkStatus({
        type: "success",
        message: "Bookmark added successfully!",
      });
      setTimeout(() => {
        setIsAddBookmarkDialogOpen(false);
      }, 1500);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add bookmark";

      setAddBookmarkStatus({
        type: "error",
        message: errorMessage,
      });
      console.error("Error adding bookmark:", error);
    } finally {
      setIsDrawerOpen(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/login");
      setIsDrawerOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="drawer drawer-end max-h-screen">
      <div className="rounded-lg ">
        <button
          className="flex items-center hover:bg-[#F26B0F] transition-all duration-300 p-1 rounded-md"
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
        >
          {isDrawerOpen ? (
            <X width={36} color="#ffffffbe" />
          ) : (
            <LucideEqual width={36} color="#ffffffbe" />
          )}
        </button>
      </div>
      <div
        className={`absolute h-screen ${
          !isDrawerOpen ? "translate-x-[20rem]" : "translate-x-0"
        } right-0 mt-[18px] duration-300 z-50`}
      >
        <div className="p-4 px-10 w-80 h-[92%] flex flex-col justify-between  gap-3 items-center  bg-[#323232] z-50 backdrop-blur-3xl ">
          <span className="flex flex-col gap-4 w-full">
            <Dialog
              open={isImportDialogOpen}
              onOpenChange={setIsImportDialogOpen}
            >
              <DialogTrigger asChild>
                <button className="text-[#ffffffbe] w-full flex items-center bg-[#4a4a4a] py-2 px-6 rounded-lg text-center hover:bg-[#3c3c3c] hover:shadow-lg hover:shadow-[#00000090] duration-300 border-2 border-[#ffffff16] hover:border-2 hover:border-[#ffffff29] hover:text-white hover:scale-95 justify-center">
                  <span className="flex gap-2">
                    <LucideFileDown width={20} height={20} color="#ffffff" />
                    Import Bookmarks
                  </span>
                </button>
              </DialogTrigger>
              <DialogContent className="modal-box bg-[#323232] border-[1px] border-[#ffffff2a] drop-shadow-xl">
                <form onSubmit={handleSubmit}>
                  <h3 className="p-4 text-2xl text-white text-center">
                    Import your bookmarks now!
                  </h3>
                  <h2 className="-mt-2 text-md text-[#ecebeb5f] text-center hover:underline hover:text-[#fcfcfc] hover:cursor-pointer duration-200">
                    Where do I find it?
                  </h2>
                  <div className="modal-action flex flex-col justify-center">
                    <input
                      type="file"
                      accept=".html"
                      name="import"
                      className="input text-white py-2 px-1 border-2 border-[#606060] mt-6 mx-8 mb-2 bg-[#575757] rounded-md disabled:opacity-50"
                      onChange={handleFileChange}
                      required
                      disabled={importStatus.type === "loading"}
                    />
                    <div className="h-6 mx-8 text-center text-sm">
                      {importStatus.type === "loading" && (
                        <p className="text-blue-400">{importStatus.message}</p>
                      )}
                      {importStatus.type === "success" && (
                        <p className="text-green-400">{importStatus.message}</p>
                      )}
                      {importStatus.type === "error" && (
                        <p className="text-red-400">{importStatus.message}</p>
                      )}
                    </div>
                    <div className="flex gap-2 justify-end py-4 mt-2 mx-8">
                      <DialogClose asChild>
                        <button
                          type="button"
                          className="text-white p-2 px-4 rounded-lg text-center bg-[#45454568] border-[1px] border-[#fff0] hover:border-[1px] hover:border-[#ffffff7c] duration-300 disabled:opacity-50"
                          disabled={importStatus.type === "loading"}
                        >
                          Cancel
                        </button>
                      </DialogClose>
                      <button
                        type="submit"
                        className="text-white btn bg-[#fa6323] p-2 px-4 rounded-lg text-center hover:bg-[#fa6323] hover:shadow-lg hover:shadow-[#00000090] duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={
                          !file ||
                          importStatus.type === "loading" ||
                          importStatus.type === "success"
                        }
                      >
                        {importStatus.type === "loading"
                          ? "Uploading..."
                          : "Upload"}
                      </button>
                    </div>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog
              open={isAddBookmarkDialogOpen}
              onOpenChange={setIsAddBookmarkDialogOpen}
            >
              <DialogTrigger asChild>
                <button className="w-full flex items-center text-[#ffffffbe] py-2 px-6 rounded-lg text-center hover:bg-[#fa6323] hover:shadow-lg hover:shadow-[#00000090] duration-300 border-2 border-[#ffffff16] hover:border-2 hover:border-[#ff986c] hover:text-white hover:scale-95 justify-center bg-[#F26B0F]">
                  <span className="flex items-center gap-2">
                    <Plus width={20} height={20} color="#ffffff" />
                    Add Bookmark
                  </span>
                </button>
              </DialogTrigger>
              <DialogContent className="modal-box bg-[#323232] border-[1px] border-[#ffffff2a] drop-shadow-xl">
                <h3 className="p-4 text-2xl text-white text-center">
                  Add your bookmarks link
                </h3>
                <h2 className="-mt-2 text-md text-[#ecebeb5f] text-center hover:underline hover:text-[#fcfcfc] hover:cursor-pointer duration-200">
                  More ways to add bookmarks
                </h2>
                <div className="modal-action flex justify-center">
                  <form
                    onSubmit={handleAddBookmarkSubmit}
                    className="flex flex-col gap-4 mx-10 mb-4 w-full"
                  >
                    <div className="flex flex-col justify-center w-full gap-4">
                      <div>
                        <label htmlFor="link" className="text-white">
                          Link*
                        </label>
                        <input
                          id="link"
                          type="url"
                          placeholder="https://example.com"
                          className="text-white input input-bordered w-full p-2 bg-[#424242] rounded-md border-[1px] focus:border-[#9d9d9d9c] disabled:opacity-50"
                          required
                          value={link}
                          onChange={(e) => {
                            setLink(e.target.value);
                            setAddBookmarkStatus({ type: "idle", message: "" });
                          }}
                          disabled={addBookmarkStatus.type === "loading"}
                        />
                      </div>
                    </div>
                    <div className="h-6 text-center text-sm">
                      {addBookmarkStatus.type === "loading" && (
                        <p className="text-blue-400">
                          {addBookmarkStatus.message}
                        </p>
                      )}
                      {addBookmarkStatus.type === "success" && (
                        <p className="text-green-400">
                          {addBookmarkStatus.message}
                        </p>
                      )}
                      {addBookmarkStatus.type === "error" && (
                        <p className="text-red-400">
                          {addBookmarkStatus.message}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-4 mt-2">
                      <button
                        type="submit"
                        className="text-white p-2 px-4 rounded-lg bg-[#fa6323] hover:shadow-lg hover:shadow-[#00000090] duration-300 border-2 border-[#fff0] hover:border-[#ff986c] disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={
                          !link ||
                          addBookmarkStatus.type === "loading" ||
                          addBookmarkStatus.type === "success"
                        }
                      >
                        {addBookmarkStatus.type === "loading"
                          ? "Adding..."
                          : "Add"}
                      </button>
                      <DialogClose asChild>
                        <button
                          type="button"
                          className="text-white p-2 px-4 rounded-lg text-center bg-[#45454568] border-[1px] border-[#fff0] hover:border-[1px] hover:border-[#ffffff7c] duration-300 disabled:opacity-50"
                          disabled={addBookmarkStatus.type === "loading"}
                        >
                          Cancel
                        </button>
                      </DialogClose>
                    </div>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </span>

          <button
            onClick={handleSignOut}
            className="w-full  flex items-center text-[#ffffffbe] py-2 px-6 rounded-lg text-center hover:bg-[#4a4a4a] hover:shadow-lg hover:shadow-[#00000090] duration-300 border-2 border-[#ffffff16] hover:border-2 hover:border-[#ffffff29] hover:text-white hover:scale-95 justify-center mt-auto"
          >
            <span className="flex items-center gap-2 z-50">
              <LogOut width={20} height={20} color="#ffffff" />
              Logout
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
