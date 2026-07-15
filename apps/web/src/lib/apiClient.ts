import axios, { AxiosInstance, AxiosError } from "axios";
import Cookies from "js-cookie";
import {
  SearchResponse,
  ListBookmarksResponse,
  UploadResponse,
  AddBookmarkResponse,
  HealthCheckResponse,
  RateLimitInfo,
} from "@/types/api";
import { zipFile } from "@/utils/zipFile";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

class ApiClient {
  private client: AxiosInstance;
  private pendingRequests = new Map<string, Promise<unknown>>();

  constructor() {
    this.client = axios.create({
      baseURL: `${BACKEND_URL}/api/v1`,
      timeout: 20000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = Cookies.get("authToken");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle rate limit info and compression logging
    this.client.interceptors.response.use(
      (response) => {
        // Log compression info if available
        const contentEncoding = response.headers["content-encoding"];
        if (
          contentEncoding &&
          (contentEncoding === "gzip" || contentEncoding === "deflate")
        ) {
          console.log(
            `Response compressed with ${contentEncoding} for ${response.config.url}`
          );
        }

        // Extract rate limit info if available
        const rateLimitInfo: RateLimitInfo | null = this.extractRateLimitInfo(
          response.headers
        );
        if (rateLimitInfo) {
          response.data._rateLimit = rateLimitInfo;
        }
        return response;
      },
      (error) => Promise.reject(error)
    );
  }

  private extractRateLimitInfo(headers: unknown): RateLimitInfo | null {
    const headersObj = headers as Record<string, string>;
    const limit = headersObj["ratelimit-limit"];
    const remaining = headersObj["ratelimit-remaining"];
    const reset = headersObj["ratelimit-reset"];

    if (limit && remaining && reset) {
      return {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
      };
    }
    return null;
  }

  // Health Check
  async healthCheck(): Promise<HealthCheckResponse> {
    const { data } = await this.client.get<HealthCheckResponse>("/health");
    return data;
  }

  // Get All Bookmarks with Pagination
  async getBookmarks(
    userId: string,
    page: number = 1,
    limit: number = 40
  ): Promise<ListBookmarksResponse> {
    const key = `bookmarks-${userId}-${page}-${limit}`;

    // Return pending request if it exists (request deduplication)
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<ListBookmarksResponse>;
    }

    const request = this.client
      .get<ListBookmarksResponse>(`/list/${userId}`, {
        params: { page, limit },
      })
      .then(({ data }) => {
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, request);
    return request;
  }

  // Search Bookmarks with Pagination
  async searchBookmarks(
    query: string,
    userId: string,
    page: number = 1,
    limit: number = 24
  ): Promise<SearchResponse> {
    const key = `search-${userId}-${query}-${page}-${limit}`;

    // Return pending request if it exists (request deduplication)
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<SearchResponse>;
    }

    const request = this.client
      .post<SearchResponse>(`/search/${encodeURIComponent(query)}`, {
        userId,
        page,
        limit,
      })
      .then(({ data }) => {
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, request);
    return request;
  }

  // Upload Bookmarks File
  async uploadBookmarks(
    file: File,
    userId: string,
    onProgress?: (progress: number) => void,
    compress: boolean = true // Enable compression by default
  ): Promise<UploadResponse> {
    // Compress the file if requested
    let fileToUpload = file;
    if (compress) {
      console.log("Compressing file before upload...");
      if (onProgress) {
        onProgress(0); // Show initial progress
      }
      fileToUpload = await zipFile(file);
      console.log(`File compressed: ${file.name} -> ${fileToUpload.name}`);
    }

    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("userId", userId);

    const { data } = await this.client.post<UploadResponse>(
      "/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 300000, // 5 minutes for large file uploads
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(progress);
          }
        },
      }
    );
    return data;
  }

  // Add Single Bookmark
  async addBookmark(
    userId: string,
    link: string
  ): Promise<AddBookmarkResponse> {
    const { data } = await this.client.post<AddBookmarkResponse>(
      "/addBookmark",
      {
        userId,
        link,
      }
    );
    return data;
  }

  // Helper to check if error is rate limit error
  isRateLimitError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      return error.response?.status === 429;
    }
    return false;
  }

  // Helper to extract error message
  getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return (
        axiosError.response?.data?.message ||
        axiosError.message ||
        "An unexpected error occurred"
      );
    }
    return "An unexpected error occurred";
  }
}

export const apiClient = new ApiClient();
