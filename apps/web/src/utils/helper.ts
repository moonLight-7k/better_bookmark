export const getGridColumns = () => {
  if (typeof window === "undefined") return 4;
  else {
    const width = window.innerWidth;

    if (width < 480) return 2; // Extra small devices (phones)
    if (width < 640) return 2; // Small devices (larger phones)
    if (width < 770) return 3; // Medium devices (small tablets)
    if (width < 1025) return 4; // Large devices (tablets, small laptops)
    if (width < 1280) return 5; // Extra large devices (laptops/desktops)
    return 6; // 2XL and beyond
  }
};

// Uniform spacing between cards, both horizontally and vertically.
// Matches the `gap-5` (1.25rem = 20px) used by the skeleton loader.
export const GRID_GAP = 20;

// Card dimensions mirror Card.tsx: 180x182 desktop, 142x154 on max-sm (<640px).
// The virtualized grid positions fixed-size cards inside percentage-width cells,
// so the only way to keep horizontal and vertical gaps equal is to size the
// grid container to exactly `columns * (cardWidth + GRID_GAP)` and to set the
// row height to `cardHeight + GRID_GAP`.
export const getGridMetrics = () => {
  const columns = getGridColumns();
  const isMobile =
    typeof window !== "undefined" && window.innerWidth < 640;
  const cardWidth = isMobile ? 142 : 180;
  const cardHeight = isMobile ? 154 : 182;

  return {
    columns,
    itemHeight: cardHeight + GRID_GAP,
    gridWidth: columns * (cardWidth + GRID_GAP),
  };
};
