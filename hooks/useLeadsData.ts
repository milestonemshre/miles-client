import {
  fetchAgents,
  fetchLeads,
  fetchSourceOptions,
  fetchStatusOptions,
  fetchTagOptions,
  FilterOption,
  FilterOptions,
} from "@/services/api";
import { useCallback, useEffect, useRef, useState } from "react";
import Toast from "react-native-root-toast";

export interface UseLeadsDataProps {
  user: any;
  filters: FilterOptions;
  searchTerm: string;
  currentPage: number;
  leadsPerPage: number;
  shouldFetchLeads?: boolean;
}

export interface UseLeadsDataReturn {
  // Data
  leads: any[];
  totalLeads: number;
  totalPages: number;

  // Filter options
  statusOptions: FilterOption[];
  sourceOptions: FilterOption[];
  tagOptions: FilterOption[];
  agents: any[];

  // Loading states
  loading: boolean;

  // Functions
  refreshLeads: (explicitPage?: number) => Promise<void>;
  setLeadsManually: (leads: any[], totalLeads?: number) => void;
}

/**
 * Custom hook to manage leads data, filter options, and loading states
 * Handles API calls, pagination, and provides a clean interface for the component
 */
export const useLeadsData = ({
  user,
  filters,
  searchTerm,
  currentPage,
  leadsPerPage,
  shouldFetchLeads = true,
}: UseLeadsDataProps): UseLeadsDataReturn => {
  // Core data state
  const [leads, setLeads] = useState<any[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter options state
  const [statusOptions, setStatusOptions] = useState<FilterOption[]>([]);
  const [sourceOptions, setSourceOptions] = useState<FilterOption[]>([]);
  const [tagOptions, setTagOptions] = useState<FilterOption[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  
  // Request tracking to prevent race conditions
  const requestCounterRef = useRef(0);
  const latestRequestRef = useRef(0);

  /**
   * Fetch leads data with current parameters
   * Allow passing explicit page to avoid stale state issues
   */
  const refreshLeads = useCallback(async (explicitPage?: number) => {
    if (!user || !user.id || !shouldFetchLeads) {
      setLoading(false);
      return;
    }
    
    // Increment request counter and track this request
    requestCounterRef.current += 1;
    const thisRequestId = requestCounterRef.current;
    latestRequestRef.current = thisRequestId;
    
    setLoading(true);

    const pageToUse = explicitPage !== undefined ? explicitPage : currentPage;

    try {
      const response = await fetchLeads(user, filters, searchTerm, {
        page: pageToUse,
        limit: leadsPerPage,
      });

      // Only update state if this is still the latest request
      if (thisRequestId === latestRequestRef.current) {
        console.log(`🔄 useLeadsData updating: page ${pageToUse}, ${response.data.length} leads`);
        console.log('📋 Hook leads:', response.data.map(lead => ({ id: lead._id, name: lead.Name })));
        
        setLeads(response.data);
        setTotalLeads(response.totalLeads);

        const calculatedTotalPages = Math.ceil(
          response.totalLeads / leadsPerPage
        );
        setTotalPages(calculatedTotalPages);
      }
    } catch (error) {
      // Only show error if this is still the latest request
      if (thisRequestId === latestRequestRef.current) {
        Toast.show(`Error fetching leads: ${error.message}`, {
          duration: Toast.durations.LONG,
        });
        setLeads([]);
        setTotalLeads(0);
        setTotalPages(0);
      }
    }

    // Only update loading state if this is still the latest request
    if (thisRequestId === latestRequestRef.current) {
      setLoading(false);
    }
  }, [user, filters, searchTerm, currentPage, leadsPerPage, shouldFetchLeads]);

  /**
   * Load filter options when user is available
   */
  const loadFilterOptions = useCallback(async () => {
    if (!user || !user.id) return;

    try {
      // Load all filter options in parallel
      const [statusOpts, sourceOpts, agentsData, tagsResponse] =
        await Promise.all([
          fetchStatusOptions(),
          fetchSourceOptions(),
          fetchAgents(user),
          fetchTagOptions(1, 100), // Load initial tag options
        ]);

      setStatusOptions(statusOpts);
      setSourceOptions(sourceOpts);
      setAgents(agentsData);
      setTagOptions(tagsResponse.options);
    } catch (error) {
      Toast.show("Error loading filter options", {
        duration: Toast.durations.SHORT,
      });
    }
  }, [user]);

  // Load filter options when user becomes available
  useEffect(() => {
    if (user && user.id) {
      loadFilterOptions();
    }
  }, [user, loadFilterOptions]);

  // Fetch leads when user and shouldFetchLeads conditions are met
  // Exclude currentPage to prevent conflicts with manual pagination
  useEffect(() => {
    if (user && user.id && shouldFetchLeads) {
      console.log(`🔄 useLeadsData effect triggered by filters/search change`);
      refreshLeads();
    }
  }, [user?.id, shouldFetchLeads, filters, searchTerm, leadsPerPage]);

  // Allow manual setting of leads data to prevent conflicts
  const setLeadsManually = useCallback((newLeads: any[], newTotalLeads?: number) => {
    console.log(`🔧 Manually setting ${newLeads.length} leads in hook`);
    setLeads(newLeads);
    if (newTotalLeads !== undefined) {
      setTotalLeads(newTotalLeads);
      const calculatedTotalPages = Math.ceil(newTotalLeads / leadsPerPage);
      setTotalPages(calculatedTotalPages);
    }
  }, [leadsPerPage]);

  return {
    // Data
    leads,
    totalLeads,
    totalPages,

    // Filter options
    statusOptions,
    sourceOptions,
    tagOptions,
    agents,

    // Loading states
    loading,

    // Functions
    refreshLeads,
    setLeadsManually,
  };
};
