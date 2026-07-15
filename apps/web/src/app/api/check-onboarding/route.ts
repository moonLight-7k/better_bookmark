import { NextRequest, NextResponse } from "next/server";
import { getDataFromDatabase } from "@/utils/firebase/utils.firebase";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if user has bookmarks in Firebase
    const bookmarksData = await getDataFromDatabase(
      `users/${userId}/bookmarks`
    );

    const hasCompletedOnboarding =
      bookmarksData !== null &&
      (Array.isArray(bookmarksData)
        ? bookmarksData.length > 0
        : Object.keys(bookmarksData).length > 0);

    return NextResponse.json({
      hasCompletedOnboarding,
    });
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return NextResponse.json(
      { error: "Failed to check onboarding status" },
      { status: 500 }
    );
  }
}
