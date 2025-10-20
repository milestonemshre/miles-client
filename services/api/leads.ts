import { createAuthHeaders, validateAuthToken } from "./auth";
import {
  FilterOptions,
  LeadRequestOptions,
  LeadsResponse,
  PaginationParams,
} from "./types";

/**
 * Build request body for leads API call
 */
export const buildLeadsRequestBody = (
  user: any,
  filters: FilterOptions,
  searchText: string,
  pagination: PaginationParams,
  options: LeadRequestOptions = {}
) => {
  // Determine selected agents from filters
  let selectedAgents = [];
  let requestOptions = {};

  if (filters?.selectedAgents && filters.selectedAgents.length > 0) {
    selectedAgents = filters.selectedAgents;

    // Remove non-assigned from selected agents if it exists
    selectedAgents = filters.selectedAgents.filter(
      (agent) => agent !== "non-assigned"
    );
  } else if (user.role === "superAdmin") {
    // For superAdmin with no explicit selection, let backend decide scope
    selectedAgents = [];
    requestOptions = { viewAllLeads: true };
  } else {
    selectedAgents = [user.id];
  }

  const apiPage = pagination.page + 1; // Convert 0-based to 1-based for API

  return {
    searchTerm: searchText.trim(),
    selectedAgents: selectedAgents,
    selectedStatuses: filters.selectedStatuses || [],
    selectedSources: filters.selectedSources || [],
    selectedTags: filters.selectedTags || [],
    date:
      filters.dateRange && (filters.dateRange[0] || filters.dateRange[1])
        ? filters.dateRange
            .filter((date) => date !== null)
            .map((date) => date!.toISOString())
        : [],
    dateFor: filters.dateFor || "LeadIntroduction",
    searchBoxFilters: filters.searchBoxFilters || ["LeadInfo"],
    page: apiPage,
    limit: pagination.limit.toString(),
    userid: user.id,
    ...requestOptions,
    ...options,
  };
};

/**
 * Fetch leads with pagination and filtering
 */
export const fetchLeads = async (
  user: any,
  filters: FilterOptions,
  searchText: string,
  pagination: PaginationParams,
  options: LeadRequestOptions = {}
): Promise<LeadsResponse> => {
  if (!user || !user.id) {
    throw new Error("User not available");
  }

  const tokenValid = await validateAuthToken();

  if (!tokenValid) {
    throw new Error("Authentication failed");
  }

  const headers = await createAuthHeaders();
  const requestBody = buildLeadsRequestBody(
    user,
    filters,
    searchText,
    pagination,
    options
  );

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BASE_URL}/api/Lead/get`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch leads: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  return {
    data: Array.isArray(data.data) ? data.data : [],
    totalLeads: data.totalLeads || 0,
  };
};

/**
 * Get meetings for a specific lead
 * @param leadId - The ID of the lead
 * @returns Promise<any[]> - Array of meetings
 */
export const getLeadMeetings = async (leadId: string) => {
  if (!(await validateAuthToken())) {
    throw new Error("Authentication failed. Please login again.");
  }

  try {
    const headers = await createAuthHeaders();
    const url = `${process.env.EXPO_PUBLIC_BASE_URL}/api/Meeting/get/${leadId}`;

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch meetings: HTTP ${response.status}`);
    }

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      throw new Error("Invalid JSON response from server");
    }

    const meetings = result.data || [];
    return meetings;
  } catch (error) {
    throw error;
  }
};
