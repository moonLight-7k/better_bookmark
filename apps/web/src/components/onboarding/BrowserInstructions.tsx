import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircleIcon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@radix-ui/react-accordion";
import { browserInstructions } from "@/data/BrowserInstructionData";

const getBrowserIcon = (browserId: string, size: number = 18) => {
  switch (browserId) {
    case "chrome":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="4" />
          <line x1="21.17" y1="8" x2="12" y2="8" />
          <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
          <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
        </svg>
      );
    case "firefox":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M19.07 4.93a10 10 0 0 0 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 0 0 7.07" />
        </svg>
      );
    case "edge":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case "safari":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    default:
      return <CircleIcon className="mr-2" size={size} />;
  }
};

// Helper function to format instructions with kbd tags
const formatInstructionText = (text: string) => {
  // Match UI elements like (⋮), (≡), (⋯)
  const uiElementsRegex = /\(([⋮≡⋯])\)/g;

  // Format menu paths (text > text > text)
  const parts = text.split(">");

  if (parts.length === 1) {
    // No menu paths, just handle UI elements
    return text.replace(uiElementsRegex, "(<kbd>$1</kbd>)");
  }

  // Create formatted text with menu paths
  let formattedText = "";
  parts.forEach((part, idx) => {
    // Format any UI elements in this part
    const formattedPart = part.replace(uiElementsRegex, "(<kbd>$1</kbd>)");

    if (idx === 0) {
      formattedText += formattedPart;
    } else {
      // For menu items after the first
      formattedText += ` <strong style="color: #F26B0F">&gt;</strong> <strong style="color: #F26B0F"><kbd>${formattedPart.trim()}</kbd></strong>`;
    }
  });

  return formattedText;
};

interface BrowserInstructionsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export const BrowserInstructions: React.FC<BrowserInstructionsProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="space-y-4">
      <p className="mb-4 text-white/50">
        Select your browser to view export instructions:
      </p>

      {/* Desktop view - Tabs */}
      <div className="hidden md:block">
        <Tabs
          defaultValue="chrome"
          value={activeTab}
          onValueChange={onTabChange}
          className="w-full"
        >
          <TabsList
            className="grid grid-cols-4 mb-6"
            style={{ backgroundColor: "#3a3a3a" }}
          >
            {browserInstructions.map((browser) => (
              <TabsTrigger
                key={browser.id}
                value={browser.id}
                className="flex items-center gap-2"
                style={
                  {
                    "--tab-accent": "#F26B0F",
                    "--tab-text":
                      browser.id === activeTab ? "#ffffff" : "#e0e0e0",
                    backgroundColor:
                      browser.id === activeTab ? "#F26B0F" : "transparent",
                    color: browser.id === activeTab ? "#ffffff" : "#e0e0e0",
                  } as React.CSSProperties
                }
              >
                <span className="hidden sm:inline">
                  {getBrowserIcon(browser.id, 16)}
                </span>
                {browser.name.split(" ")[0]}
              </TabsTrigger>
            ))}
          </TabsList>

          {browserInstructions.map((browser) => (
            <TabsContent
              key={browser.id}
              value={browser.id}
              className="rounded-md p-6 border border-white/20"
            >
              <h3 className="text-lg font-medium mb-2 flex items-center">
                {getBrowserIcon(browser.id, 24)}
                {browser.name}
              </h3>
              <ol
                className="list-decimal list-inside space-y-2 ml-6"
                style={{ color: "#e0e0e0" }}
              >
                {browser.steps.map((step, index) => (
                  <li
                    key={index}
                    dangerouslySetInnerHTML={{
                      __html: formatInstructionText(step),
                    }}
                  />
                ))}
              </ol>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Mobile view - Accordion */}
      <div className="md:hidden">
        <Accordion type="single" collapsible className="w-full">
          {browserInstructions.map((browser) => (
            <AccordionItem key={browser.id} value={browser.id}>
              <AccordionTrigger
                className="flex items-center"
                style={{ color: "#F26B0F" }}
              >
                <span className="flex items-center">
                  {getBrowserIcon(browser.id)}
                  {browser.name}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div
                  className="pt-2 pb-4 px-4"
                  style={{ backgroundColor: "#323232" }}
                >
                  <ol
                    className="list-decimal list-inside space-y-2 ml-2"
                    style={{ color: "#e0e0e0" }}
                  >
                    {browser.steps.map((step, index) => (
                      <li
                        key={index}
                        dangerouslySetInnerHTML={{
                          __html: formatInstructionText(step),
                        }}
                      />
                    ))}
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <style jsx global>{`
        kbd {
          background-color: #444;
          border-radius: 4px;
          border: 1px solid #666;
          color: #e0e0e0;
          display: inline-block;
          font-size: 0.85em;
          font-weight: 500;
          line-height: 1;
          padding: 2px 5px;
          white-space: nowrap;
          margin: 0 1px;
          transition: background-color 0.2s;
        }

        kbd:hover {
          background-color: #555;
        }
      `}</style>
    </div>
  );
};
