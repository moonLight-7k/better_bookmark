import { ImageResponse } from 'next/og';
 
// Route segment config
export const runtime = 'edge';
 
// Image metadata
export const alt = 'betterBookmark - AI-Powered Bookmark Search';
export const size = {
  width: 1200,
  height: 630,
};
 
export const contentType = 'image/png';
 
// Image generation
export default async function Image() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          fontSize: 128,
          background: 'linear-gradient(to bottom right, #4F46E5, #8B5CF6)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: '40px',
        }}
      >
        <img
          src={new URL('/public/LogoFull.svg', import.meta.url).toString()}
          alt="betterBookmark Logo"
          width={200}
          height={200}
          style={{ marginBottom: '20px' }}
        />
        <div style={{ fontSize: '64px', fontWeight: 'bold', marginBottom: '20px' }}>
          betterBookmark
        </div>
        <div style={{ fontSize: '32px', textAlign: 'center', maxWidth: '80%' }}>
          AI-Powered Bookmark Search & Management
        </div>
      </div>
    ),
    { ...size }
  );
}