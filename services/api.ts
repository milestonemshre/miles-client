import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";
import Toast from "react-native-root-toast";
export interface FilterOptions {
  searchTerm: string;
  searchBoxFilters: string[];
  selectedAgents: string[];
  selectedStatuses: string[];
  selectedSources: string[];
  selectedTags: string[];
  dateRange: [Date | null, Date | null];
  dateFor: string;
  leadType?: "community" | "marketing";
}

export interface LeadRequestOptions {
  includeNonAssigned?: boolean;
  viewAllLeads?: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface LeadsResponse {
  data: any[];
  totalLeads: number;
}

export interface FilterOption {
  value: string;
  label: string;
  color: string;
  requiresReminder?: "yes" | "no" | "optional";
}

export interface TagsResponse {
  options: FilterOption[];
  hasMore: boolean;
  totalCount: number;
}

/**
 * Create standardized authentication headers for API requests
 * Ensures consistent authentication across platforms matching the web application's format
 */
export const createAuthHeaders = async () => {
  const storedToken = await SecureStore.getItemAsync("userToken");
  if (!storedToken) throw new Error("No authentication token available");

  return {
    accept: "application/json, text/plain, */*",
    "content-type": "application/json",
    Cookie: `token=${storedToken}`,
    referer: `${process.env.EXPO_PUBLIC_BASE_URL}/Leads/Marketing`,
    origin: `${process.env.EXPO_PUBLIC_BASE_URL}`,
    "user-agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) MilesClient-Mobile/1.0.0",
    "x-requested-with": "XMLHttpRequest",
  };
};

/**
 * Add a new reminder
 * @param reminderData - The reminder data to submit
 * @returns Promise<any> - API response
 */
export const addReminder = async (reminderData: any) => {
  if (!(await validateAuthToken())) {
    throw new Error("Authentication failed. Please login again.");
  }

  try {
    const headers = await createAuthHeaders();
    const url = `${process.env.EXPO_PUBLIC_BASE_URL}/api/Reminder/add`;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(reminderData),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(
        errorData.error || `Failed to add reminder: HTTP ${response.status}`
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing reminder
 * @param reminderId - The ID of the reminder to update
 * @param reminderData - The updated reminder data
 * @returns Promise<any> - API response
 */
export const updateReminder = async (reminderId: string, reminderData: any) => {
  if (!(await validateAuthToken())) {
    throw new Error("Authentication failed. Please login again.");
  }

  try {
    const headers = await createAuthHeaders();
    const url = `${process.env.EXPO_PUBLIC_BASE_URL}/api/Reminder/update/${reminderId}`;

    const response = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(reminderData),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(
        errorData.error || `Failed to update reminder: HTTP ${response.status}`
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Get reminders for a specific lead
 * @param leadId - The ID of the lead
 * @returns Promise<any[]> - Array of reminders
 */
export const getLeadReminders = async (leadId: string) => {
  if (!(await validateAuthToken())) {
    throw new Error("Authentication failed. Please login again.");
  }

  try {
    const headers = await createAuthHeaders();
    const url = `${process.env.EXPO_PUBLIC_BASE_URL}/api/Reminder/get/${leadId}`;

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(
        errorData.error || `Failed to fetch reminders: HTTP ${response.status}`
      );
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Get all users/agents for assignee selection
 * @returns Promise<User[]> - Array of users
 */
export const getUsers = async () => {
  if (!(await validateAuthToken())) {
    throw new Error("Authentication failed. Please login again.");
  }

  try {
    const headers = await createAuthHeaders();
    const url = `${process.env.EXPO_PUBLIC_BASE_URL}/api/staff/get`;

    console.log("👥 Fetching users from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response
        .text() // Use text() first to see raw response
        .then((text) => {
          try {
            return JSON.parse(text);
          } catch {
            return { error: text || `HTTP ${response.status}` };
          }
        });
      throw new Error(
        errorData.error || `Failed to fetch users: HTTP ${response.status}`
      );
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Refresh the authentication token
 */
const refreshAuthToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await SecureStore.getItemAsync("refreshToken");
    if (!refreshToken) {
      return null;
    }

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_BASE_URL}/api/auth/refresh`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `refreshToken=${refreshToken}`,
        },
      }
    );

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.token) {
        // Store new access token
        await SecureStore.setItemAsync("userToken", result.token);

        // Store new refresh token if provided
        if (result.refreshToken) {
          await SecureStore.setItemAsync("refreshToken", result.refreshToken);
        }

        return result.token;
      }
    }

    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Validate token and attempt refresh if needed
 * @returns Promise<boolean> - true if token is valid or refreshed, false if authentication failed
 */
export const validateAuthToken = async (): Promise<boolean> => {
  try {
    const storedToken = await SecureStore.getItemAsync("userToken");
    if (!storedToken) {
      return false;
    }

    // Check if current token is valid
    const tokenPayload = jwtDecode(storedToken) as { exp?: number };
    const currentTime = Math.floor(Date.now() / 1000);
    const tokenExpiry = tokenPayload.exp;
    const timeUntilExpiry = tokenExpiry ? tokenExpiry - currentTime : -1;

    // If token expires within 5 minutes, try to refresh it
    if (timeUntilExpiry < 300) {
      const newToken = await refreshAuthToken();

      if (newToken) {
        return true; // Successfully refreshed
      } else {
        // Refresh failed, clear auth data
        await clearAuthData();
        Toast.show("Session expired. Please login again.", {
          duration: Toast.durations.LONG,
        });
        return false;
      }
    }

    // Token is still valid
    if (tokenExpiry && currentTime < tokenExpiry) {
      return true;
    }

    // Token is expired, try to refresh
    const newToken = await refreshAuthToken();

    if (newToken) {
      return true; // Successfully refreshed
    } else {
      // Refresh failed, clear auth data
      await clearAuthData();
      Toast.show("Session expired. Please login again.", {
        duration: Toast.durations.LONG,
      });
      return false;
    }
  } catch (tokenError) {
    console.error(tokenError);
    await clearAuthData();
    Toast.show("Invalid session. Please login again.", {
      duration: Toast.durations.LONG,
    });
    return false;
  }
};

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
    page: pagination.page + 1, // Convert 0-based to 1-based for API
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

  if (!(await validateAuthToken())) {
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
    throw new Error(`Failed to fetch leads: ${response.status}`);
  }

  const data = await response.json();
  return {
    data: Array.isArray(data.data) ? data.data : [],
    totalLeads: data.totalLeads || 0,
  };
};

/**
 * Fetch status options
 */
export const fetchStatusOptions = async (): Promise<FilterOption[]> => {
  try {
    const headers = await createAuthHeaders();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_BASE_URL}/api/Status/get`,
      {
        method: "GET",
        headers,
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.data.map((status: any) => ({
        value: status._id,
        label: status.Status,
        color: status.color || "#6B7280", // Default color if not provided
        requiresReminder: status.requiresReminder,
      }));
    } else {
      return [];
    }
  } catch (error) {
    return [];
  }
};

/**
 * Fetch source options
 */
export const fetchSourceOptions = async (): Promise<FilterOption[]> => {
  try {
    const headers = await createAuthHeaders();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_BASE_URL}/api/Source/get`,
      {
        method: "GET",
        headers,
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.data.map((source: any) => ({
        value: source._id,
        label: source.Source,
        color: source.color || "#6B7280", // Default color if not provided
      }));
    } else {
      return [];
    }
  } catch (error) {
    return [];
  }
};

/**
 * Fetch tag options with pagination support
 */
export const fetchTagOptions = async (
  page = 1,
  limit = 50,
  searchTerm = ""
): Promise<TagsResponse> => {
  try {
    const headers = await createAuthHeaders();
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(searchTerm && { search: searchTerm }),
    });

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_BASE_URL}/api/tags/get?${queryParams}`,
      {
        method: "GET",
        headers,
      }
    );

    if (response.ok) {
      const data = await response.json();
      const tagOpts = data.data.map((tag: any) => ({
        label: tag.Tag,
        value: `${tag.Tag}::${tag._id}`, // Use actual tag ID
        color: tag.color || "#6B7280", // Default color if not provided
      }));

      return {
        options: tagOpts,
        hasMore: tagOpts.length === limit,
        totalCount: data.totalTags || data.total || tagOpts.length,
      };
    } else {
      return { options: [], hasMore: false, totalCount: 0 };
    }
  } catch (error) {
    return { options: [], hasMore: false, totalCount: 0 };
  }
};

/**
 * Transform agents data to tree structure like web app
 */
export const transformAgentsDataToTreeSelect = (data: any[]): any[] => {
  if (!data || !Array.isArray(data)) return [];

  return data.map((userData) => ({
    value: userData._id,
    title: userData.username,
    label: userData.username,
    role: userData.role || userData.Role, // Preserve role information
    email: userData.email,
    personalEmail: userData.personalemail,
    isVerified: userData.isVerified,
    children: userData.subordinates
      ? userData.subordinates.map((subordinate: any) => ({
          value: subordinate._id,
          title: subordinate.username,
          label: subordinate.username,
          role: subordinate.role || subordinate.Role, // Preserve role information
          email: subordinate.email,
          personalEmail: subordinate.personalemail,
          isVerified: subordinate.isVerified,
          children: subordinate.subordinates
            ? transformAgentsDataToTreeSelect([subordinate])[0].children
            : undefined,
        }))
      : undefined,
  }));
};

/**
 * Update a lead with new data
 */
export const updateLead = async (
  leadId: string,
  updates: any
): Promise<any> => {
  if (!leadId) {
    throw new Error("Lead ID is required");
  }

  if (!(await validateAuthToken())) {
    throw new Error("Authentication failed");
  }

  const headers = await createAuthHeaders();

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BASE_URL}/api/Lead/update/${leadId}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify(updates),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update lead: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
};

/**
 * Fetch agents options with hierarchy
 */
export const fetchAgents = async (user: any): Promise<any[]> => {
  if (!user || !user.id) return [];

  try {
    const headers = await createAuthHeaders();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_BASE_URL}/api/staff/get?preserveHierarchy=true`,
      {
        method: "GET",
        headers,
      }
    );

    if (response.ok) {
      const data = await response.json();
      const treeData = transformAgentsDataToTreeSelect(data.data);

      return treeData;
    } else {
      return [];
    }
  } catch (error) {
    return [];
  }
};

/**
 * Fetch full lead details by ID including all related data
 */
export const fetchLeadById = async (leadId: string): Promise<any> => {
  if (!leadId) {
    throw new Error("Lead ID is required");
  }

  if (!(await validateAuthToken())) {
    throw new Error("Authentication failed");
  }

  const headers = await createAuthHeaders();

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BASE_URL}/api/Lead/${leadId}`,
    {
      method: "GET",
      headers,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch lead: ${response.status}`);
  }

  const data = await response.json();
  return data.data || data;
};

/**
 * Fetch comments for a specific lead
 */
export const fetchLeadComments = async (leadId: string): Promise<any[]> => {
  if (!leadId) {
    throw new Error("Lead ID is required");
  }

  if (!(await validateAuthToken())) {
    throw new Error("Authentication failed");
  }

  const headers = await createAuthHeaders();

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BASE_URL}/api/comment/get/${leadId}`,
    {
      method: "GET",
      headers,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch comments: ${response.status}`);
  }

  const data = await response.json();
  return data.data || [];
};

/**
 * Search developers using our internal API
 */
export const searchDevelopers = async (query: string = ""): Promise<any[]> => {
  try {
    if (!(await validateAuthToken())) {
      throw new Error("Authentication failed");
    }

    const headers = await createAuthHeaders();
    const params = new URLSearchParams({
      limit: '20', // Match the previous limit of 20 results
    });
    
    if (query.trim()) {
      params.append('search', query.trim());
    }

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_BASE_URL}/api/developers?${params.toString()}`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Developer search failed: ${response.status}`);
    }

    const data = await response.json();

    // Transform the results to match the expected format
    const developerOptions = (data.data || [])
      .map((developer: any) => ({
        value: developer.Developer || developer.name,
        label: developer.Developer || developer.name,
        adsCount: developer.properties_sale_count || 0,
      }));

    return developerOptions;
  } catch (error) {
    console.error(error);
    // Return empty array on error instead of throwing
    return [];
  }
};

/**
 * Export leads to CSV
 * @param leadIds - Array of lead IDs to export (optional - if not provided, exports all filtered leads)
 * @param filters - Current filter state for exporting filtered leads
 * @param user - Current user data
 * @returns Promise<Blob> - CSV file blob
 */
export const exportLeads = async (
  leadIds?: string[],
  filters?: any,
  user?: any,
  leadType: string = "cold"
): Promise<Blob> => {
  if (!(await validateAuthToken())) {
    throw new Error("Authentication failed");
  }

  const headers = await createAuthHeaders();

  const requestData: any = {};

  // If specific leads are selected, only export those
  if (leadIds && leadIds.length > 0) {
    requestData.leadIds = leadIds;
  } else if (filters && user) {
    // Export filtered leads
    if (filters.selectedAgents && filters.selectedAgents.length > 0) {
      requestData.selectedAgents = filters.selectedAgents.filter(
        (agent: string) => agent !== "non-assigned" && agent !== "select-all"
      );
    }

    if (filters.selectedStatuses && filters.selectedStatuses.length > 0) {
      requestData.selectedStatuses = filters.selectedStatuses.filter(
        (status: string) => status !== "select-all"
      );
    }

    if (filters.selectedSources && filters.selectedSources.length > 0) {
      requestData.selectedSources = filters.selectedSources.filter(
        (source: string) => source !== "select-all"
      );
    }

    if (filters.selectedTags && filters.selectedTags.length > 0) {
      requestData.selectedTags = filters.selectedTags
        .filter((tag: string) => tag !== "select-all")
        .map((tag: string) => {
          // If tag has :: format, extract just the tag name part
          const parts = tag.split("::");
          return parts.length > 1 ? parts[0] : tag;
        });
    }

    if (filters.searchTerm) requestData.searchTerm = filters.searchTerm;
    if (filters.dateRange && filters.dateRange.length === 2) {
      requestData.date = filters.dateRange
        .map((date: Date | null) =>
          date instanceof Date ? date.toISOString() : date
        )
        .filter(Boolean);
    }
    if (filters.dateFor) requestData.dateFor = filters.dateFor;
    if (filters.searchBoxFilters)
      requestData.searchBoxFilters = filters.searchBoxFilters;
    if (user?.id) requestData.userid = user.id;
  }

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BASE_URL}/api/Lead/export/${leadType}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(requestData),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to export leads: ${response.status}`);
  }

  const blob = await response.blob();

  if (!blob || blob.size === 0) {
    throw new Error("No data to export");
  }

  return blob;
};

/**
 * Delete multiple leads
 * @param leadIds - Array of lead IDs to delete
 * @returns Promise<any> - API response
 */
export const deleteLeads = async (leadIds: string[]): Promise<any> => {
  if (!leadIds || leadIds.length === 0) {
    throw new Error("Lead IDs are required");
  }

  if (!(await validateAuthToken())) {
    throw new Error("Authentication failed");
  }

  const headers = await createAuthHeaders();

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BASE_URL}/api/Lead/delete`,
    {
      method: "DELETE",
      headers,
      body: JSON.stringify({ leadIds }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete leads: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

/**
 * Bulk update multiple leads
 * @param bulkData - Bulk update data containing leads and updates
 * @returns Promise<any> - API response with possible skipped leads
 */
export const bulkUpdateLeads = async (bulkData: any): Promise<any> => {
  if (!bulkData.leads || bulkData.leads.length === 0) {
    throw new Error("Lead IDs are required for bulk update");
  }

  if (!(await validateAuthToken())) {
    throw new Error("Authentication failed");
  }

  const headers = await createAuthHeaders();

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BASE_URL}/api/Lead/bulk`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify(bulkData),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to bulk update leads: ${response.status}`);
  }

  const data = await response.json();

  if (data.skippedLeads && data.skippedLeads.length > 0) {
  } else {
  }

  return data;
};

/**
 * Add a comment to a lead
 */
export const addLeadComment = async (
  leadId: string,
  content: string
): Promise<any> => {
  if (!leadId || !content?.trim()) {
    throw new Error("Lead ID and comment content are required");
  }

  if (!(await validateAuthToken())) {
    throw new Error("Authentication failed");
  }

  const headers = await createAuthHeaders();

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BASE_URL}/api/comment/add`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        leadData: { _id: leadId },
        content: content.trim(),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to add comment: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

/**
 * Delete a comment
 */
export const deleteLeadComment = async (commentId: string): Promise<any> => {
  if (!commentId) {
    throw new Error("Comment ID is required");
  }

  if (!(await validateAuthToken())) {
    throw new Error("Authentication failed");
  }

  const headers = await createAuthHeaders();

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BASE_URL}/api/comment/delete/${commentId}`,
    {
      method: "DELETE",
      headers,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete comment: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

/**
 * Add a new meeting
 * @param meetingData - The meeting data to submit
 * @returns Promise<any> - API response
 */
export const addMeeting = async (meetingData: any) => {
  if (!(await validateAuthToken())) {
    throw new Error("Authentication failed. Please login again.");
  }

  try {
    const headers = await createAuthHeaders();
    const url = `${process.env.EXPO_PUBLIC_BASE_URL}/api/Meeting/add`;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(meetingData),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(
        errorData.error || `Failed to add meeting: HTTP ${response.status}`
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing meeting
 * @param meetingId - The ID of the meeting to update
 * @param meetingData - The updated meeting data
 * @returns Promise<any> - API response
 */
export const updateMeeting = async (meetingId: string, meetingData: any) => {
  if (!(await validateAuthToken())) {
    throw new Error("Authentication failed. Please login again.");
  }

  try {
    const headers = await createAuthHeaders();
    const url = `${process.env.EXPO_PUBLIC_BASE_URL}/api/Meeting/update/${meetingId}`;

    const response = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(meetingData),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(
        errorData.error || `Failed to update meeting: HTTP ${response.status}`
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch status counts for user with current filters applied
 * @param user - Current user data
 * @param filters - Current filter state
 * @param searchTerm - Current search term
 * @returns Promise<{[statusId: string]: {count: number, filteredCount: number}}
 */
export const fetchStatusCounts = async (
  user: any,
  filters: FilterOptions,
  searchTerm: string
): Promise<{
  [statusId: string]: { count: number; filteredCount: number };
}> => {
  if (!user || !user.id) {
    throw new Error("User not available");
  }

  if (!(await validateAuthToken())) {
    throw new Error("Authentication failed");
  }

  const headers = await createAuthHeaders();

  // Build payload similar to the web app
  const payload = {
    searchTerm: searchTerm.trim(),
    selectedAgents: filters.selectedAgents || [user.id],
    selectedStatuses: filters.selectedStatuses || [],
    selectedSources: filters.selectedSources || [],
    selectedTags:
      filters.selectedTags?.map((tag) => {
        const parts = tag.split("::");
        return parts.length > 1 ? parts[0] : tag;
      }) || [],
    date:
      filters.dateRange && (filters.dateRange[0] || filters.dateRange[1])
        ? filters.dateRange
            .filter((date) => date !== null)
            .map((date) => date!.toISOString())
        : [],
    dateFor: filters.dateFor || "LeadIntroduction",
    searchBoxFilters: filters.searchBoxFilters || ["LeadInfo"],
    userid: user.id,
  };

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_BASE_URL}/api/Lead/statusCountsForUser`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch status counts: ${response.status}`);
  }

  const data = await response.json();
  return data.statusCounts || {};
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


/**
 * Log a dialer time tracking session
 * @param sessionData - Dialer session data including leadId, phoneNumber, duration, etc.
 * @returns Promise<any> - API response
 */
export const logDialerSession = async (sessionData: {
  leadId: string;
  phoneNumber: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  transferredToDialer: boolean;
  platform: string;
}): Promise<any> => {
  if (!(await validateAuthToken())) {
    throw new Error("Authentication failed. Please login again.");
  }

  try {
    const headers = await createAuthHeaders();
    const url = `${process.env.EXPO_PUBLIC_BASE_URL}/api/dialer-session/log`;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(sessionData),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(
        errorData.error || `Failed to log dialer session: HTTP ${response.status}`
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Get agent call statistics for a date range
 * @param userId - User ID (optional, defaults to current user)
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Promise<any> - API response with call statistics
 */
export const getDialerSessionStats = async (userId: string | null, startDate: string, endDate: string): Promise<any> => {
  if (!(await validateAuthToken())) {
    throw new Error("Authentication failed. Please login again.");
  }

  try {
    const headers = await createAuthHeaders();
    
    // Build query parameters
    const params = new URLSearchParams({
      startDate,
      endDate,
    });
    
    if (userId) {
      params.append('userId', userId);
    }
    
    const url = `${process.env.EXPO_PUBLIC_BASE_URL}/api/dialer-session/stats?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(
        errorData.error || `Failed to get dialer session stats: HTTP ${response.status}`
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Clear authentication data from secure storage
 */
export const clearAuthData = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync("userToken");
    await SecureStore.deleteItemAsync("refreshToken");
  } catch (error) {
    console.error("Error clearing auth data:", error);
  }
};
