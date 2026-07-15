import React from "react";
import { AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface InfoNoteProps {
  title: string;
  description: string;
  tooltipContent?: string;
  icon?: React.ReactNode;
  accentColor?: string;
}

export const InfoNote: React.FC<InfoNoteProps> = ({
  title,
  description,
  tooltipContent,
  icon = <AlertCircle className="h-4 w-4 mr-1" />,
  accentColor = "#F26B0F",
}) => {
  return (
    <TooltipProvider>
      <div
        className="flex flex-col gap-1 rounded-sm p-3 text-sm"
        style={{
          backgroundColor: "#323232",
          borderLeft: `3px solid ${accentColor}`,
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1">
            {React.cloneElement(icon as React.ReactElement, {
              style: { color: accentColor },
            })}
            <span className="font-medium" style={{ color: accentColor }}>
              {title}
            </span>
          </div>

          {tooltipContent && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-0 text-xs"
                  style={{ color: accentColor }}
                >
                  ?
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-xs text-xs"
                style={{
                  backgroundColor: "#323232",
                  color: "#ffffff",
                  borderColor: accentColor,
                }}
              >
                {tooltipContent}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="text-xs text-muted" style={{ color: "#e0e0e0" }}>
          {description}
        </p>
      </div>
    </TooltipProvider>
  );
};
