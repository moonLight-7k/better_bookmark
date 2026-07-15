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
