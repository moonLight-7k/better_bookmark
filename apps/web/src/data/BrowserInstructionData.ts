import { ReactNode } from "react";

export interface BrowserInstruction {
  id: string;
  name: string;
  icon: ReactNode;
  steps: string[];
}

export const browserInstructions: Array<Omit<BrowserInstruction, "icon">> = [
  {
    id: "chrome",
    name: "Google Chrome",
    steps: [
      "Open Chrome.",
      "Click the three dots (⋮) in the upper right corner.",
      "Navigate to Bookmarks > Bookmark Manager.",
      "In the Bookmark Manager, click the three dots (⋮) in the top-right corner.",
      "Select Export Bookmarks.",
      "Choose a location to save the HTML file.",
    ],
  },
  {
    id: "firefox",
    name: "Mozilla Firefox",
    steps: [
      "Open Firefox.",
      "Click the menu button (three lines ≡) in the upper right corner.",
      "Select Bookmarks > Manage Bookmarks.",
      "In the Library window, click Import and Backup.",
      "Choose Export Bookmarks to HTML.",
      "Select a location to save the file and click Save.",
    ],
  },
  {
    id: "edge",
    name: "Microsoft Edge",
    steps: [
      "Open Edge.",
      "Click the three dots (⋯) in the upper right corner.",
      "Select Favorites > Manage Favorites.",
      "Click the three dots (⋯) in the top-right corner of the Favorites menu.",
      "Choose Export Favorites.",
      "Select a location to save the HTML file and click Save.",
    ],
  },
  {
    id: "safari",
    name: "Safari",
    steps: [
      "Open Safari.",
      "In the menu bar, click File.",
      "Select Export Bookmarks.",
      "Choose a location to save the file and click Save.",
    ],
  },
];
