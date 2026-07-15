import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "betterBookmark - AI-Powered Bookmark Search";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: "linear-gradient(to bottom right, #4F46E5, #6366F1)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          padding: "40px",
          borderRadius: "16px",
        }}
      >
        <img
          src={new URL("/public/LogoFull.svg", import.meta.url).toString()}
          alt="betterBookmark Logo"
          width={180}
          height={180}
          style={{ marginBottom: "20px" }}
        />
        <div
          style={{ fontSize: "58px", fontWeight: "bold", marginBottom: "20px" }}
        >
          betterBookmark
        </div>
        <div style={{ fontSize: "28px", textAlign: "center", maxWidth: "80%" }}>
          Find your bookmarks with AI-powered search
        </div>
      </div>
    ),
    { ...size }
  );
}
