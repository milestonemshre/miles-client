import * as SecureStore from "expo-secure-store";
import { createAuthHeaders } from "./api/auth";

export interface CampaignFilters {
  campaignName: string;
  page?: number;
  limit?: number;
}

export interface CampaignLeadsResponse {
  message: string;
  data: any[];
  totalLeads: number;
}

export interface CampaignLeadIdsResponse {
  message: string;
  data: string[];
  totalLeads: number;
}

export interface CampaignsWithCountsResponse {
  data: Array<{
    _id: string;
    Tag: string;
    leadCount: number;
    pendingLeadsCount?: number;
    lastLeadAssignedDate?: string;
  }>;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Fetch leads for a specific campaign
 * Uses the optimized campaign endpoint with pending-first sorting
 */
export const fetchCampaignLeads = async (
  campaignFilters: CampaignFilters
): Promise<CampaignLeadsResponse> => {
  if (!campaignFilters.campaignName) {
    throw new Error("Campaign name is required");
  }

  const headers = await createAuthHeaders();

  const requestBody = {
    campaignName: campaignFilters.campaignName,
    page: campaignFilters.page || 1,
    limit: campaignFilters.limit || 50,
  };

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BASE_URL}/api/Lead/campaign`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Campaign Leads API Error:", {
      status: response.status,
      statusText: response.statusText,
      url: `${process.env.EXPO_PUBLIC_BASE_URL}/api/Lead/campaign`,
      requestBody,
      errorText,
    });

    if (response.status === 303 || response.status === 401) {
      console.log("Got 401/303 but not throwing auth error for debugging");
      // throw new Error('Authentication failed. Please login again.');
    }

    throw new Error(
      `Failed to fetch campaign leads: HTTP ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();
  return {
    message: data.message,
    data: Array.isArray(data.data) ? data.data : [],
    totalLeads: data.totalLeads || 0,
  };
};

export interface CampaignsWithCountsParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "leadCount" | "Tag" | "latestAssigned" | "newest";
  sortOrder?: "asc" | "desc";
  signal?: AbortSignal;
}

/**
 * Fetch all campaigns with their lead counts
 */
export const fetchCampaignsWithCounts = async (
  params: CampaignsWithCountsParams = {}
): Promise<CampaignsWithCountsResponse> => {
  const {
    page = 1,
    limit = 100,
    search = "",
    sortBy = "leadCount",
    sortOrder = "desc",
    signal,
  } = params;

  const headers = await createAuthHeaders();

  // Build query parameters
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sortBy,
    sortOrder,
  });

  if (search.trim()) {
    queryParams.append("search", search.trim());
  }

  // Use the properly optimized with-counts endpoint
  const campaignsUrl = `${
    process.env.EXPO_PUBLIC_BASE_URL
  }/api/campaigns/with-counts?${queryParams.toString()}`;

  console.log("Fetching campaigns from:", campaignsUrl);

  try {
    const response = await Promise.race([
      fetch(campaignsUrl, {
        method: "GET",
        headers,
        signal, // Add abort signal support
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout after 30s")), 30000)
      ),
    ]);

    console.log("Campaigns API Response:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Campaign API Error:", {
        status: response.status,
        statusText: response.statusText,
        url: campaignsUrl,
        headers: response.headers,
        errorText,
      });

      if (response.status === 303 || response.status === 401) {
        console.log("Got 401/303 but not throwing auth error for debugging");
        // throw new Error('Authentication failed. Please login again.');
      }

      throw new Error(
        `Failed to fetch campaigns: HTTP ${response.status} - ${errorText}`
      );
    }

    const result = await response.json();

    console.log("Campaigns API Result:", {
      hasData: !!result.data,
      dataLength: result.data?.length || 0,
      hasPagination: !!result.pagination,
      sampleData: result.data?.slice(0, 2)?.map((item) => ({
        id: item._id,
        tag: item.Tag,
        leadCount: item.leadCount,
      })),
    });

    return {
      data: result.data || [],
      pagination: result.pagination,
    };
  } catch (error) {
    console.error("Campaigns fetch error:", {
      error: error.message,
      stack: error.stack,
      url: campaignsUrl,
    });
    throw error;
  }
};

/**
 * Fetch ordered lead IDs for a campaign (lightweight, optimized for calling queue)
 */
export const fetchCampaignLeadIds = async (
  campaignFilters: CampaignFilters
): Promise<CampaignLeadIdsResponse> => {
  if (!campaignFilters.campaignName) {
    throw new Error("Campaign name is required");
  }

  const headers = await createAuthHeaders();
  const requestBody = {
    campaignName: campaignFilters.campaignName,
    page: campaignFilters.page || 1,
    limit: campaignFilters.limit || 1000,
  };

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BASE_URL}/api/Lead/campaign/ids`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch campaign lead ids: HTTP ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();
  return {
    message: data.message,
    data: Array.isArray(data.data) ? data.data : [],
    totalLeads: data.totalLeads || 0,
  };
};

/**
 * Diagnostic function to test staging environment connectivity
 */
export const diagnoseStagingIssues = async (): Promise<void> => {
  console.log("=== STAGING DIAGNOSTIC START ===");

  // Check base URL
  console.log("Base URL:", process.env.EXPO_PUBLIC_BASE_URL);

  // Check stored tokens
  const userToken = await SecureStore.getItemAsync("userToken");
  const refreshToken = await SecureStore.getItemAsync("refreshToken");

  console.log("Token Status:", {
    hasUserToken: !!userToken,
    userTokenLength: userToken?.length,
    hasRefreshToken: !!refreshToken,
    refreshTokenLength: refreshToken?.length,
  });

  // Test basic connectivity
  try {
    console.log("Testing basic connectivity...");
    const basicResponse = await fetch(
      `${process.env.EXPO_PUBLIC_BASE_URL}/api/healthcheck`,
      {
        method: "GET",
      }
    );

    console.log("Basic connectivity:", {
      status: basicResponse.status,
      statusText: basicResponse.statusText,
      ok: basicResponse.ok,
    });
  } catch (error) {
    console.error("Basic connectivity failed:", error);
  }

  // Test with auth headers
  if (userToken) {
    try {
      console.log("Testing authenticated request...");
      const headers = await createAuthHeaders();
      const authResponse = await fetch(
        `${process.env.EXPO_PUBLIC_BASE_URL}/api/campaigns/with-counts?page=1&limit=1`,
        {
          method: "GET",
          headers,
        }
      );

      console.log("Authenticated request:", {
        status: authResponse.status,
        statusText: authResponse.statusText,
        ok: authResponse.ok,
        redirected: authResponse.redirected,
        url: authResponse.url,
      });

      const responseText = await authResponse.text();
      console.log(
        "Response text (first 200 chars):",
        responseText.substring(0, 200)
      );
    } catch (error) {
      console.error("Authenticated request failed:", error);
    }
  }

  console.log("=== STAGING DIAGNOSTIC END ===");
};
