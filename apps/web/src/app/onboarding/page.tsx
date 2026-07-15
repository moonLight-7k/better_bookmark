"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

// Import the new modular components
import { BrowserInstructions } from "../../components/onboarding/BrowserInstructions";
import {
  FileUploader,
  UploadStatus,
} from "../../components/onboarding/FileUploader";
import { useUserDetails } from "@/hooks/useUserDetails";
import { useUploadBookmarks } from "@/hooks/useApiQuery";

function OnboardingPage() {
  const { setOnboardingComplete } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState("chrome");
  const { userDetails } = useUserDetails();

  // Use TanStack Query mutation hook
  const uploadMutation = useUploadBookmarks();

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
      setFile(selectedFile);
      setUploadStatus("idle");
      setErrorMessage("");
    } else {
      setFile(null);
      setUploadStatus("error");
      setErrorMessage("Please upload an HTML file exported from your browser");
    }
  };

  const handleImport = async () => {
    if (!file || !userDetails?.uid) return;

    setUploadStatus("loading");

    try {
      await uploadMutation.mutateAsync({
        file,
        userId: userDetails.uid,
        compress: true, // Compress file before upload (default: true)
      });

      console.log("Upload successful");
      setOnboardingComplete();
      setUploadStatus("success");
    } catch (error) {
      console.error("Error uploading file:", error);

      const axiosError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };

      const errorMessage =
        axiosError.response?.data?.message ||
        (error instanceof Error ? error.message : "An unknown error occurred");

      setUploadStatus("error");
      setErrorMessage(`Failed to import bookmarks: ${errorMessage}`);
    }
  };

  return (
    <div
      className=" max-w-screen px-4 lg:px-[22rem] py-8"
      style={{ backgroundColor: "#323232", color: "#ffffff" }}
    >
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold mb-4 text-white">
          Import Your Bookmarks
        </h1>
        <p className=" text-white/50 text-center max-w-2xl mb-6">
          Follow these steps to import bookmarks from your browser into
          BetterBookmark
        </p>
      </div>

      <div className="grid gap-8 mb-10">
        {/* Browser Instructions Section */}
        <section className="rounded-lg p-6 shadow-sm border border-white/20">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            Export Bookmarks from Your Browser
          </h2>

          <BrowserInstructions
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* <InfoNote
            title="Pro Tip"
            description="Most modern browsers allow you to export your bookmarks as an HTML file. If you're having trouble, check your browser's help center for detailed instructions."
            tooltipContent="We currently support bookmarks exported from Chrome, Firefox, Edge, and Safari."
            accentColor="#F26B0F"
          /> */}
        </section>

        {/* File Upload Section */}
        <section className="rounded-lg p-6 shadow-sm border border-white/20">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            Upload Your Bookmarks
          </h2>

          <FileUploader
            uploadStatus={uploadStatus}
            errorMessage={errorMessage}
            onFileSelect={handleFileSelect}
            onImport={handleImport}
          />
        </section>
      </div>

      {/* Success dialog that appears when upload is successful */}
      {uploadStatus === "success" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-[#323232] rounded-lg p-6 max-w-md w-full border border-white/20 drop-shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div
                className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4"
                style={{ backgroundColor: "rgba(242, 107, 15, 0.2)" }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: "#F26B0F" }}
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">
                Bookmarks Imported Successfully!
              </h3>
              <p className="text-white/70 mb-6 ">
                Ready to rediscover your bookmarks? Let BetterBookmark guide the
                way!
              </p>

              <div className="flex flex-col w-full gap-3">
                <Link href="/" passHref>
                  <Button
                    className="w-full hover:drop-shadow-xl duration-300"
                    style={{
                      backgroundColor: "#F26B0F",
                      borderColor: "#F26B0F",
                    }}
                  >
                    Go to My Bookmarks
                  </Button>
                </Link>
                {/* <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setUploadStatus("idle")}
                  style={{ borderColor: "#F26B0F", color: "#F26B0F" }}
                >
                  Import More Bookmarks
                </Button> */}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OnboardingPage;
