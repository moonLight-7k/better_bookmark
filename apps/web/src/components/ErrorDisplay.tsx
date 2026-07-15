import React, { useState } from "react";
import { AlertCircle, RefreshCw, Check, BugOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { ref, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { v4 as uuidv4 } from "uuid";

// Helper function to get IP and location data
async function getIpAndLocationData() {
  try {
    const response = await fetch("https://ipapi.co/json/");
    const data = await response.json();

    return {
      ipAddress: data.ip,
      location: {
        city: data.city,
        region: data.region,
        country: data.country_name,
        postal: data.postal,
        latitude: data.latitude,
        longitude: data.longitude,
      },
    };
  } catch (error) {
    console.error("Error fetching IP and location data:", error);
    return {
      ipAddress: "unknown",
      location: {
        city: "unknown",
        region: "unknown",
        country: "unknown",
        postal: "unknown",
        latitude: 0,
        longitude: 0,
      },
    };
  }
}

interface ErrorDisplayProps {
  error: string | null;
  errorType: "network" | "other" | null;
  onRetry: () => void;
}

export default function ErrorDisplay({
  error,
  errorType,
  onRetry,
}: ErrorDisplayProps) {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Get auth information
  const { user } = useAuth();

  // Function to upload error report to Firebase
  const uploadErrorReport = async () => {
    try {
      if (!error || !errorType) return;

      // Get IP and location data
      const ipData = await getIpAndLocationData();

      // Create a unique ID for the report
      const reportId = uuidv4();

      // Prepare the report object
      const report = {
        errorMessage: error,
        errorType: errorType,
        ipAddress: ipData.ipAddress,
        location: ipData.location,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        userEmail: user?.email || "anonymous",
        userId: user?.uid || "anonymous",
      };

      // Set the reference path based on the user ID
      const reportPath = `reports/${user?.uid || "anonymous"}/${reportId}`;

      // Upload to Firebase Realtime Database
      await set(ref(db, reportPath), report);

      return true;
    } catch (err) {
      console.error("Error uploading report to Firebase:", err);
      return false;
    }
  };

  const handleReportIssue = async () => {
    setReportSubmitting(true);

    try {
      // Upload error report to Firebase
      const success = await uploadErrorReport();

      if (success) {
        setReportSubmitted(true);
        setTimeout(() => {
          setShowReportDialog(false);
          setReportSubmitted(false);
        }, 3000);
      }
    } catch (reportError) {
      console.error("Error reporting issue:", reportError);
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="bg-[#323232] border-[1px] border-[#ffffff2a] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium">
              {reportSubmitted ? "Report Sent" : "Report Issue"}
            </DialogTitle>
          </DialogHeader>

          {!reportSubmitted ? (
            <>
              <div className="py-4">
                <p className="mb-2">
                  Do you want to report this issue to our team? This will help
                  us fix the problem faster.
                </p>
                <p className="text-sm text-gray-400">
                  We&apos;ll collect technical information about the error that
                  occurred. No personal data will be collected.
                </p>
              </div>
              <DialogFooter className="flex justify-end gap-3">
                <button
                  onClick={() => setShowReportDialog(false)}
                  className="px-3 py-1.5 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportIssue}
                  disabled={reportSubmitting}
                  className="px-3 py-1.5 rounded-md bg-[#fa6323] text-white hover:bg-[#fa6323]/80 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {reportSubmitting ? (
                    <>
                      Reporting<span className="animate-pulse">...</span>
                    </>
                  ) : (
                    <>Report Issue</>
                  )}
                </button>
              </DialogFooter>
            </>
          ) : (
            <div className="py-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
                <Check size={24} />
              </div>
              <p className="text-white">Thank you for reporting this issue!</p>
              <p className="text-sm text-gray-400 mt-1">
                Our team will look into it as soon as possible.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-col items-center justify-center min-h-64 p-8 mx-auto max-w-md pt-52">
        <div className={` p-6 w-full `}>
          <div className="flex items-center mb-4">
            <AlertCircle
              size={24}
              className={
                errorType === "network" ? "text-[#fa6323]" : "text-red-500"
              }
            />
            <h3
              className={`ml-2 font-bold ${
                errorType === "network" ? "text-[#fa6323]" : "text-red-700"
              }`}
            >
              {errorType === "network" ? "Connection Issue" : "Error Occurred"}
            </h3>
          </div>

          <p className="mb-4 text-white/50">
            {error ||
              "We&apos;re having trouble connecting to our servers. Please try again."}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onRetry}
              className={`flex items-center justify-center px-4 py-2 rounded-md text-white transition-colors bg-[#fa6323] hover:bg-[#fa6323]/80`}
            >
              <RefreshCw size={16} className="mr-2" /> Retry
            </button>

            <button
              onClick={() => setShowReportDialog(true)}
              className="flex items-center justify-center px-4 py-2 bg-zinc-600 hover:bg-zinc-500 rounded-md text-white transition-colors"
            >
              <BugOff size={16} className="mr-2" /> Report Issue
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
