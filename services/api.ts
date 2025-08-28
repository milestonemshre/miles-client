import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-root-toast';

export interface FilterOptions {
  searchTerm: string;
  searchBoxFilters: string[];
  selectedAgents: string[];
  selectedStatuses: string[];
  selectedSources: string[];
  selectedTags: string[];
  dateRange: [Date | null, Date | null];
  dateFor: string;
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
  color?: string;
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
  const storedToken = await SecureStore.getItemAsync('userToken');
  if (!storedToken) throw new Error('No authentication token available');

  return {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
    Cookie: `token=${storedToken}`,
    referer: `${process.env.EXPO_PUBLIC_BASE_URL}/Leads/Marketing`,
    origin: `${process.env.EXPO_PUBLIC_BASE_URL}`,
    'user-agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) MilesClient-Mobile/1.0.0',
    'x-requested-with': 'XMLHttpRequest',
  };
};

/**
 * Validate token and check if it's expired
 * @returns Promise<boolean> - true if token is valid, false otherwise
 */
export const validateAuthToken = async (): Promise<boolean> => {
  try {
    const storedToken = await SecureStore.getItemAsync('userToken');
    if (!storedToken) {
      Toast.show('Please login again to access leads', {
        duration: Toast.durations.LONG,
      });
      return false;
    }

    const tokenPayload = JSON.parse(atob(storedToken.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    const tokenExpiry = tokenPayload.exp;

    if (currentTime > tokenExpiry) {
      Toast.show('Your session has expired. Please login again.', {
        duration: Toast.durations.LONG,
      });
      await SecureStore.deleteItemAsync('userToken');
      return false;
    }

    return true;
  } catch (tokenError) {
    Toast.show('Invalid session token. Please login again.', {
      duration: Toast.durations.LONG,
    });
    await SecureStore.deleteItemAsync('userToken');
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

    // Check if 'non-assigned' is selected and add special flags
    const hasNonAssigned = filters.selectedAgents.includes('non-assigned');
    if (hasNonAssigned) {
      console.log('Filters: non-assigned leads selected via agents dropdown');
      requestOptions.includeNonAssigned = true;
      if (
        user.permissions?.lead?.includes('view_non_assigned') ||
        user.permissions?.lead?.includes('view_all') ||
        user.role === 'superAdmin'
      ) {
        requestOptions.viewAllLeads = true;
      }
    }
  } else if (user.role === 'superAdmin') {
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
    dateFor: filters.dateFor || 'LeadIntroduction',
    searchBoxFilters: filters.searchBoxFilters || ['LeadInfo'],
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
    throw new Error('User not available');
  }

  if (!(await validateAuthToken())) {
    throw new Error('Authentication failed');
  }

  const headers = await createAuthHeaders();
  const requestBody = buildLeadsRequestBody(user, filters, searchText, pagination, options);

  console.log('📤 API Request Body:', {
    selectedAgents: requestBody.selectedAgents,
    selectedStatuses: requestBody.selectedStatuses,
    selectedSources: requestBody.selectedSources,
    selectedTags: requestBody.selectedTags,
    searchTerm: requestBody.searchTerm,
    dateRange: requestBody.date,
    page: requestBody.page,
    limit: requestBody.limit,
  });

  const response = await fetch(`${process.env.EXPO_PUBLIC_BASE_URL}/api/Lead/get`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API request failed with status ${response.status}:`, errorText);
    throw new Error(`Failed to fetch leads: ${response.status}`);
  }

  const data = await response.json();
  console.log('✅ Processing API response:', {
    keys: Object.keys(data),
    totalLeads: data.totalLeads,
    dataLength: Array.isArray(data.data) ? data.data.length : 0,
  });

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
    const response = await fetch(`${process.env.EXPO_PUBLIC_BASE_URL}/api/Status/get`, {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      const data = await response.json();
      return data.data.map((status: any) => ({
        value: status._id,
        label: status.Status,
        color: status.color,
      }));
    } else {
      console.error('Failed to fetch status options:', response.status);
      return [];
    }
  } catch (error) {
    console.error('Error fetching status options:', error);
    return [];
  }
};

/**
 * Fetch source options
 */
export const fetchSourceOptions = async (): Promise<FilterOption[]> => {
  try {
    const headers = await createAuthHeaders();
    const response = await fetch(`${process.env.EXPO_PUBLIC_BASE_URL}/api/Source/get`, {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      const data = await response.json();
      return data.data.map((source: any) => ({
        value: source._id,
        label: source.Source,
      }));
    } else {
      console.error('Failed to fetch source options:', response.status);
      return [];
    }
  } catch (error) {
    console.error('Error fetching source options:', error);
    return [];
  }
};

/**
 * Fetch tag options with pagination support
 */
export const fetchTagOptions = async (
  page = 1,
  limit = 50,
  searchTerm = ''
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
        method: 'GET',
        headers,
      }
    );

    if (response.ok) {
      const data = await response.json();
      const tagOpts = data.data.map((tag: any, index: number) => ({
        label: tag.Tag,
        value: tag.Tag + '::' + (page - 1) * limit + index, // Ensure unique values across pages
      }));

      return {
        options: tagOpts,
        hasMore: tagOpts.length === limit,
        totalCount: data.totalTags || data.total || tagOpts.length,
      };
    } else {
      console.error('Failed to fetch tag options:', response.status);
      return { options: [], hasMore: false, totalCount: 0 };
    }
  } catch (error) {
    console.error('Error fetching tag options:', error);
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
    children: userData.subordinates
      ? userData.subordinates.map((subordinate: any) => ({
          value: subordinate._id,
          title: subordinate.username,
          label: subordinate.username,
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
 * Fetch agents options with hierarchy
 */
export const fetchAgents = async (user: any): Promise<any[]> => {
  if (!user || !user.id) return [];

  try {
    const headers = await createAuthHeaders();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_BASE_URL}/api/staff/get?preserveHierarchy=true`,
      {
        method: 'GET',
        headers,
      }
    );

    if (response.ok) {
      const data = await response.json();
      const treeData = transformAgentsDataToTreeSelect(data.data);

      // Add non-assigned option as the first option if user has appropriate permissions OR is superAdmin
      const hasViewAllPermission =
        user.permissions?.lead?.includes('view_all') ||
        user.permissions?.lead?.includes('view_non_assigned') ||
        user.role === 'superAdmin';

      const agentsWithNonAssigned = hasViewAllPermission
        ? [
            {
              value: 'non-assigned',
              title: 'Non-Assigned Leads',
              label: 'Non-Assigned Leads',
            },
            ...treeData,
          ]
        : treeData;

      return agentsWithNonAssigned;
    } else {
      console.error('Failed to fetch agents:', response.status);
      return [];
    }
  } catch (error) {
    console.error('Error fetching agents:', error);
    return [];
  }
};
