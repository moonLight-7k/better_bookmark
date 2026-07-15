import { Request, Response } from "express";
import { semanticSearch } from "../../service/search/search.service";
import { searchQuerySchema, searchRequestSchema } from "validation/schemas";
import { ZodError } from "zod";

export const handleSearchController = async (req: Request, res: Response) => {
  console.log("POST /api/v1/search/:query", req.params.query);
  try {
    // Validate query parameter first
    const query = searchQuerySchema.parse(req.params.query);

    // Validate request body - this will catch invalid userId formats early
    // BEFORE they reach the authorizeUser middleware
    const {
      userId,
      page = 1,
      limit = 24,
    } = searchRequestSchema.parse(req.body);

    // Note: Additional authorization check happens in authorizeUser middleware
    // to ensure authenticated user matches the requested userId

    const results = await semanticSearch(query, userId, {
      useCache: true,
    });

    // Apply pagination
    const totalResults = results?.length || 0;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = results?.slice(startIndex, endIndex) || [];
    const totalPages = Math.ceil(totalResults / limit);

    // console.log("Search results:", results);
    if (results && results.length > 0) {
      res.status(200).json({
        totalResults,
        totalPages,
        currentPage: page,
        pageSize: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        results: paginatedResults.map((result) => ({
          title: result.title,
          site: result.site,
          tags: result.tags,
          description: result.description,
          dateAdded: result.dateAdded,
          relevanceScore: result.score,
          rank: result.rank,
        })),
      });
    } else {
      res.status(200).json({
        totalResults: 0,
        totalPages: 0,
        currentPage: page,
        pageSize: limit,
        hasNextPage: false,
        hasPreviousPage: false,
        results: [],
        message: "No bookmarks match the search query",
      });
    }
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: "Validation Error",
        message: error.issues[0]?.message || "Invalid input",
        details: error.issues,
      });
      return;
    }

    console.error("Error in search controller:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
