"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import GlobalSearch from "@/components/Search";
import Main from "@/components/Main";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { hasCompletedOnboarding } = useAuth();

  useEffect(() => {
    const checkOnboarding = async () => {
      const completed = await hasCompletedOnboarding();
      if (!completed) {
        router.push('/onboarding');
      }
    };
    
    checkOnboarding();
  }, [hasCompletedOnboarding, router]);

  return (
    <div className="flex-1 bg-[#323232] overflow-hidden min-h-screen max-h-screen ">
      <Navbar />
      {/* <Pinned /> */}
      <Main />
      <GlobalSearch />
    </div>
  );
}
