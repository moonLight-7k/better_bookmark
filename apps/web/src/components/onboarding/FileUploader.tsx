import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertTriangle, File, X, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

export type UploadStatus =
  | "idle"
  | "loading"
  | "validating"
  | "success"
  | "error";

interface FileUploaderProps {
  uploadStatus: UploadStatus;
  errorMessage: string;
  onFileSelect: (file: File | null) => void;
  onImport: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  uploadStatus,
  errorMessage,
  onFileSelect,
  onImport,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string>("");
  const [isValidFile, setIsValidFile] = useState<boolean | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulate validation progress when a file is selected
  useEffect(() => {
    if (file && uploadStatus !== "error" && uploadStatus !== "success") {
      let progress = 0;
      setProgressValue(0);

      const interval = setInterval(() => {
        progress += 5;
        setProgressValue(progress);

        if (progress >= 100) {
          clearInterval(interval);
          validateFile(file);
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [file, uploadStatus]);

  const validateFile = (selectedFile: File) => {
    // HTML bookmark files should have specific content
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;

      if (content) {
        // Simple validation check for bookmark HTML files
        if (
          content.includes("<!DOCTYPE NETSCAPE-Bookmark-file-1>") ||
          content.includes("<DL>") ||
          content.toLowerCase().includes("<a href=")
        ) {
          setIsValidFile(true);
          setValidationMessage("File validated successfully! Ready to import.");
        } else {
          setIsValidFile(false);
          setValidationMessage(
            "This doesn't appear to be a valid bookmarks file. Please ensure you exported bookmarks correctly."
          );
        }
      }
    };

    reader.readAsText(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (
        selectedFile.name.endsWith(".html") ||
        selectedFile.name.endsWith(".htm")
      ) {
        setFile(selectedFile);
        setIsValidFile(null);
        setValidationMessage("");
        onFileSelect(selectedFile);
      } else {
        setFile(null);
        setIsValidFile(false);
        setValidationMessage(
          "Please select an HTML file. Other file types are not supported."
        );
        onFileSelect(null);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (
        droppedFile.name.endsWith(".html") ||
        droppedFile.name.endsWith(".htm")
      ) {
        setFile(droppedFile);
        setIsValidFile(null);
        setValidationMessage("");
        onFileSelect(droppedFile);
      } else {
        setFile(null);
        setIsValidFile(false);
        setValidationMessage(
          "Please select an HTML file. Other file types are not supported."
        );
        onFileSelect(null);
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const getDropzoneStyle = () => {
    if (isDragging) return "bg-primary/10 border-primary";
    if (isValidFile === true) return "bg-success/10 border-success";
    if (isValidFile === false) return "bg-destructive/10 border-destructive";
    if (file) return "bg-primary/10 border-primary";
    return "border-muted-foreground/25 hover:bg-muted/50";
  };

  const getBorderColor = () => {
    if (isDragging) return "#F26B0F";
    if (isValidFile === true) return "#22c55e";
    if (isValidFile === false) return "#ef4444";
    if (file) return "#F26B0F";
    return "gray";
  };

  return (
    <div className="space-y-4">
      <p className="text-white/50">
        Upload the HTML file you exported from your browser:
      </p>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${getDropzoneStyle()}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          borderColor: getBorderColor(),
          backgroundColor: "#323232",
        }}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          {file ? (
            <>
              {isValidFile === null ? (
                <div className="flex flex-col items-center">
                  <Loader2
                    className="h-10 w-10 animate-spin"
                    style={{ color: "#F26B0F" }}
                  />
                  <p
                    className="text-lg font-medium mt-2"
                    style={{ color: "#ffffff" }}
                  >
                    Validating file...
                  </p>
                  <div className="w-full max-w-xs mt-2">
                    <Progress
                      value={progressValue}
                      className="h-2"
                      style={
                        {
                          backgroundColor: "#3a3a3a",
                          "--progress-value": `${progressValue}%`,
                        } as React.CSSProperties
                      }
                    />
                  </div>
                </div>
              ) : isValidFile ? (
                <CheckCircle2
                  className="h-10 w-10"
                  style={{ color: "#22c55e" }}
                />
              ) : (
                <AlertTriangle
                  className="h-10 w-10"
                  style={{ color: "#ef4444" }}
                />
              )}

              <div className="flex items-center gap-2">
                <File className="h-4 w-4" style={{ color: "#e0e0e0" }} />
                <p className="text-lg font-medium" style={{ color: "#ffffff" }}>
                  {file.name}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setIsValidFile(null);
                    onFileSelect(null);
                  }}
                  className="h-6 w-6 p-0 rounded-full"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove file</span>
                </Button>
              </div>

              <p className="text-sm" style={{ color: "#e0e0e0" }}>
                {(file.size / 1024).toFixed(2)} KB
              </p>

              {isValidFile !== null && (
                <p
                  className="text-sm mt-2"
                  style={{ color: isValidFile ? "#22c55e" : "#ef4444" }}
                >
                  {validationMessage}
                </p>
              )}
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "white" }}
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-lg font-medium" style={{ color: "gray" }}>
                Drag and drop your HTML file here
              </p>
              <p className="text-sm" style={{ color: "#e0e0e0" }}>
                or
              </p>
              <div>
                <Input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  accept=".html,.htm"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  variant="default"
                  className="mt-2 font-mono duration-300 bg-[#323232] border border-[#F26B0F] text-[#F26B0F] hover:bg-[#F26B0F] hover:text-white hover::drop-shadow-xl"
                  onClick={handleButtonClick}
                >
                  Select File
                </Button>
              </div>
            </>
          )}
        </div>
        <p className="mt-4 text-sm" style={{ color: "gray" }}>
          Supports .html files exported from Chrome, Firefox, Edge, and Safari
        </p>
      </div>

      {uploadStatus === "error" && (
        <Alert
          variant="destructive"
          className="mt-4  bg-[#323232] border border-[#F26B0F]"
        >
          <AlertTriangle
            className="h-4 w-4 -mt-1"
            style={{ color: "#F26B0F" }}
          />
          <AlertDescription className="text-white/70 ">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {uploadStatus === "success" && (
        <Alert
          variant="default"
          className="mt-4"
          style={{
            backgroundColor: "#323232",
            borderColor: "#F26B0F",
            color: "#ffffff",
          }}
        >
          <CheckCircle2 className="h-4 w-4" style={{ color: "#F26B0F" }} />
          <AlertDescription style={{ color: "#ffffff" }}>
            Bookmarks successfully imported!
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end mt-6">
        <Button
          onClick={onImport}
          disabled={!file || !isValidFile || uploadStatus === "loading"}
          className="px-8 hover:drop-shadow-xl duration-300"
          style={{
            backgroundColor:
              file && isValidFile && uploadStatus !== "loading"
                ? "#F26B0F"
                : "",
          }}
        >
          {uploadStatus === "loading" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            "Import Bookmarks"
          )}
        </Button>
      </div>
    </div>
  );
};
