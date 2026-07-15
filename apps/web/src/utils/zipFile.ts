import JSZip from "jszip";

/**
 * Compresses a file into a ZIP archive
 * @param file - The file to compress
 * @param fileName - Optional custom name for the file inside the zip (defaults to original name)
 * @returns A new File object containing the zipped content
 */
export async function zipFile(file: File, fileName?: string): Promise<File> {
  try {
    // Create a new JSZip instance
    const zip = new JSZip();

    // Read the file content
    const fileContent = await file.arrayBuffer();

    // Add the file to the zip with its original name or custom name
    const nameInZip = fileName || file.name;
    zip.file(nameInZip, fileContent);

    // Generate the zip file as a Blob
    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: {
        level: 9, // Maximum compression
      },
    });

    // Create a new File from the Blob
    const zipFileName = file.name.replace(/\.[^/.]+$/, ".zip");
    const zippedFile = new File([zipBlob], zipFileName, {
      type: "application/zip",
    });

    console.log(`Original size: ${(file.size / 1024).toFixed(2)} KB`);
    console.log(`Compressed size: ${(zippedFile.size / 1024).toFixed(2)} KB`);
    console.log(
      `Compression ratio: ${((1 - zippedFile.size / file.size) * 100).toFixed(
        1
      )}%`
    );

    return zippedFile;
  } catch (error) {
    console.error("Error zipping file:", error);
    throw new Error(
      `Failed to compress file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Compresses multiple files into a single ZIP archive
 * @param files - Array of files to compress
 * @param zipFileName - Name for the output zip file (defaults to "bookmarks.zip")
 * @returns A new File object containing all files zipped together
 */
export async function zipMultipleFiles(
  files: File[],
  zipFileName: string = "bookmarks.zip"
): Promise<File> {
  try {
    const zip = new JSZip();

    // Add all files to the zip
    for (const file of files) {
      const fileContent = await file.arrayBuffer();
      zip.file(file.name, fileContent);
    }

    // Generate the zip file as a Blob
    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: {
        level: 9,
      },
    });

    // Create a new File from the Blob
    const zippedFile = new File([zipBlob], zipFileName, {
      type: "application/zip",
    });

    const totalOriginalSize = files.reduce((sum, file) => sum + file.size, 0);
    console.log(
      `Total original size: ${(totalOriginalSize / 1024).toFixed(2)} KB`
    );
    console.log(`Compressed size: ${(zippedFile.size / 1024).toFixed(2)} KB`);
    console.log(
      `Compression ratio: ${(
        (1 - zippedFile.size / totalOriginalSize) *
        100
      ).toFixed(1)}%`
    );

    return zippedFile;
  } catch (error) {
    console.error("Error zipping files:", error);
    throw new Error(
      `Failed to compress files: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
