"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

interface FirebaseError {
  code?: string;
  message: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [passwordStrength, setPasswordStrength] = useState<number>(0);
  const {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    hasCompletedOnboarding,
    // signInAsGuest,
  } = useAuth();

  useEffect(() => {
    const checkAndRedirect = async () => {
      if (user && !loading) {
        // Small delay to ensure cookies are set
        await new Promise((resolve) => setTimeout(resolve, 100));
        const completed = await hasCompletedOnboarding();
        if (completed) {
          router.push("/");
        } else {
          router.push("/onboarding");
        }
      }
    };

    checkAndRedirect();
  }, [user, loading, router, hasCompletedOnboarding]);

  useEffect(() => {
    if (isSignUp && password) {
      let strength = 0;
      if (password.length >= 8) strength += 1;
      if (/[A-Z]/.test(password)) strength += 1;
      if (/[0-9]/.test(password)) strength += 1;
      if (/[^A-Za-z0-9]/.test(password)) strength += 1;
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(0);
    }
  }, [password, isSignUp]);

  const getPasswordStrengthLabel = () => {
    if (!password || !isSignUp) return "";
    if (passwordStrength === 0) return "Very weak";
    if (passwordStrength === 1) return "Weak";
    if (passwordStrength === 2) return "Fair";
    if (passwordStrength === 3) return "Good";
    return "Strong";
  };

  const getPasswordStrengthColor = () => {
    if (!password || !isSignUp) return "bg-gray-300";
    if (passwordStrength === 0) return "bg-red-500";
    if (passwordStrength === 1) return "bg-orange-500";
    if (passwordStrength === 2) return "bg-yellow-500";
    if (passwordStrength === 3) return "bg-blue-500";
    return "bg-green-500";
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      // Cookie is already set by signInWithGoogle, just wait a moment for it to propagate
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error: unknown) {
      console.error("Login error:", error);
      setAuthError("Failed to sign in with Google. Please try again.");
      setIsSubmitting(false);
    }
    // Don't set isSubmitting to false here - let the useEffect handle redirect
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setAuthError("Passwords do not match");
          setIsSubmitting(false);
          return;
        }
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      // Cookie is already set by the sign-in methods, just wait a moment for it to propagate
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error: unknown) {
      console.error("Auth error:", error);
      const firebaseError = error as FirebaseError;
      const errorMessage =
        firebaseError.message || "Authentication failed. Please try again.";

      if (
        errorMessage.includes("invalid-credential") ||
        errorMessage.includes("user-not-found") ||
        errorMessage.includes("wrong-password")
      ) {
        setAuthError("Invalid email or password");
      } else if (errorMessage.includes("email-already-in-use")) {
        setAuthError("Email already in use. Try signing in instead.");
      } else if (errorMessage.includes("weak-password")) {
        setAuthError("Password should be at least 6 characters");
      } else {
        setAuthError(errorMessage);
      }
      setIsSubmitting(false);
    }
    // Don't set isSubmitting to false here - let the useEffect handle redirect
  };

  // const handleGuestSignIn = async () => {
  //   setAuthError(null);
  //   setIsSubmitting(true);
  //   try {
  //     await signInAsGuest();
  //     const hasData = await hasCompletedOnboarding();
  //     if (hasData) {
  //       router.push("/");
  //     } else {
  //       router.push("/onboarding");
  //     }
  //   } catch (error: unknown) {
  //     console.error("Guest login error:", error);
  //     setAuthError("Failed to sign in as guest. Please try again.");
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#4a4a4a]">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative bg-[#4a4a4a]">
      <div className="absolute inset-0 z-0 opacity-5">
        <div
          className="absolute inset-0 bg-repeat"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M46 46v-2h2v-4h-2v-2h-4v2h-2v4h2v2h4zM46 4V2h2v-4h-2v-2h-4v2h-2v4h2v2h4zM16 46v-2h2v-4h-2v-2h-4v2h-2v4h2v2h4zM16 4V2h2v-4h-2v-2h-4v2h-2v4h2v2h4zM34 32v-2h2v-4h-2v-2h-4v2h-2v4h2v2h4zM34 12v-2h2v-4h-2v-2h-4v2h-2v4h2v2h4zM14 32v-2h2v-4h-2v-2h-4v2h-2v4h2v2h4zM14 12v-2h2v-4h-2v-2h-4v2h-2v4h2v2h4zM24 22v-2h2v-4h-2v-2h-4v2h-2v4h2v2h4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, rgba(255,140,0,0.1) 0%, transparent 30%), radial-gradient(circle at 70% 65%, rgba(255,140,0,0.1) 0%, transparent 30%)",
          }}
        ></div>
      </div>

      <div className="w-full max-w-md p-6 space-y-4 bg-[#333333] border border-gray-600 rounded-xl shadow-2xl z-10 relative">
        <div className="flex flex-col items-center justify-center">
          <Image
            src="/LogoFull.svg"
            alt="Better Bookmark Logo"
            width={200}
            height={60}
            className="mb-2"
            priority
          />
          <h2 className=" text-2xl font-bold text-center text-white">
            {isSignUp ? "Create an account" : "Sign in to Better Bookmark"}
          </h2>
          <p className="mt-1 text-sm text-center text-gray-400">
            {isSignUp
              ? "Join to manage all your bookmarks in one place"
              : "Access all your bookmarks in one place"}
          </p>
        </div>

        {/* Auth Method Tabs */}
        <div className="flex border-b border-gray-700 mb-6">
          <button
            onClick={() => setIsSignUp(false)}
            className={`flex-1 text-center py-3 font-medium ${
              !isSignUp
                ? "text-[#F26B0F] border-b-2 border-[#F26B0F]"
                : "text-gray-400 hover:text-white"
            }`}
            aria-pressed={!isSignUp}
            aria-label="Sign in tab"
          >
            Sign In
          </button>
          <button
            onClick={() => setIsSignUp(true)}
            className={`flex-1 text-center py-3 font-medium ${
              isSignUp
                ? "text-[#F26B0F] border-b-2 border-[#F26B0F]"
                : "text-gray-400 hover:text-white"
            }`}
            aria-pressed={isSignUp}
            aria-label="Sign up tab"
          >
            Sign Up
          </button>
        </div>

        <div className="space-y-6">
          {authError && (
            <div
              className="p-3 text-sm text-white bg-red-500/90 rounded-md"
              role="alert"
              aria-live="assertive"
            >
              {authError}
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="bg-[#444444] text-white border-gray-600 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-[#444444] text-white border-gray-600 focus:border-orange-500 focus:ring-orange-500"
              />
              {isSignUp && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 h-2 rounded-full bg-gray-700 overflow-hidden">
                      <div
                        className={`h-full ${getPasswordStrengthColor()}`}
                        style={{ width: `${passwordStrength * 25}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {getPasswordStrengthLabel()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Use 8+ characters with a mix of letters, numbers & symbols
                  </p>
                </div>
              )}
              {!isSignUp && (
                <div className="mt-1 text-right">
                  <button
                    type="button"
                    className="text-xs text-orange-400/70 hover:text-orange-500 hover:underline"
                    onClick={() => {
                      alert(
                        "Password reset functionality would be implemented here"
                      );
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>
            {isSignUp && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-[#444444] text-white border-gray-600 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
            )}
            <Button
              type="submit"
              className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-md transition-colors duration-200"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Processing..."
                : isSignUp
                ? "Create Account"
                : "Sign In"}
            </Button>
          </form>

          <div className="flex flex-row items-center self-center  my-4">
            <Separator className="flex-grow bg-gray-600 w-1/3" />
            <span className="px-3 text-nowrap text-xs text-gray-400 uppercase">
              Or
            </span>
            <Separator className="flex-grow bg-gray-600 w-1/3" />
          </div>

          {/* Social Login */}
          <Button
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 py-2 bg-[#444444] text-white border-gray-600 hover:text-white hover:bg-[#505050] transition-colors duration-200"
            disabled={isSubmitting}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18.1711 8.36788H17.4998V8.33329H9.99984V11.6666H14.7094C14.0223 13.607 12.1761 14.9999 9.99984 14.9999C7.23859 14.9999 4.99984 12.7612 4.99984 9.99996C4.99984 7.23871 7.23859 4.99996 9.99984 4.99996C11.2744 4.99996 12.434 5.48079 13.3169 6.26621L15.6744 3.90871C14.1886 2.52204 12.1969 1.66663 9.99984 1.66663C5.39775 1.66663 1.6665 5.39788 1.6665 9.99996C1.6665 14.602 5.39775 18.3333 9.99984 18.3333C14.6019 18.3333 18.3332 14.602 18.3332 9.99996C18.3332 9.44121 18.2757 8.89579 18.1711 8.36788Z"
                fill="#FFC107"
              />
              <path
                d="M2.62744 6.12663L5.36411 8.12913C6.10661 6.29538 7.90078 4.99996 9.99994 4.99996C11.2745 4.99996 12.4341 5.48079 13.317 6.26621L15.6745 3.90871C14.1887 2.52204 12.197 1.66663 9.99994 1.66663C6.74078 1.66663 3.9262 3.47454 2.62744 6.12663Z"
                fill="#FF3D00"
              />
              <path
                d="M10 18.3333C12.1521 18.3333 14.1042 17.5041 15.5758 16.17L13.0383 13.9875C12.1737 14.6452 11.1056 15 10 15C7.83917 15 5.99833 13.6229 5.30583 11.6917L2.58917 13.785C3.86833 16.4708 6.71333 18.3333 10 18.3333Z"
                fill="#4CAF50"
              />
              <path
                d="M18.1713 8.36796H17.5V8.33337H10V11.6667H14.7096C14.3809 12.5902 13.7889 13.3972 13.0379 14.0013L13.0392 14.0004L15.5767 16.1829C15.4046 16.3404 18.3333 14.1667 18.3333 10.0001C18.3333 9.44129 18.2758 8.89587 18.1713 8.36796Z"
                fill="#1976D2"
              />
            </svg>
            <span>
              {isSubmitting ? "Processing..." : "Continue with Google"}
            </span>
          </Button>

          {/* Guest Login */}
          {/* <Button
            onClick={handleGuestSignIn}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 py-2 mt-2 bg-[#444444] text-white hover:text-white border-gray-600 hover:bg-[#505050] transition-colors duration-200"
            disabled={isSubmitting}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-orange-400"
            >
              <path
                d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
                fill="currentColor"
              />
            </svg>
            <span>{isSubmitting ? "Processing..." : "Continue as Guest"}</span>
          </Button> */}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            By signing in, you agree to our{" "}
            <span className="text-orange-400 hover:underline cursor-pointer">
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="text-orange-400 hover:underline cursor-pointer">
              Privacy Policy
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
