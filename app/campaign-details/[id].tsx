import LoadingView from "@/components/LoadingView";
import { fetchCampaignLeads } from "@/services/campaignApi";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-root-toast";
import { UserContext } from "../_layout";

interface Lead {
  _id: string;
  Name: string;
  Phone?: string;
  AltPhone?: string;
  Description?: string;
  LeadStatus?: {
    _id: string;
    Status: string;
    color: string;
  };
  Source?: {
    _id: string;
    Source: string;
  };
  Assigned?: {
    username: string;
    Avatar?: string;
  };
  tags?: Array<{
    Tag: string;
  }>;
  lastComment?: {
    Content: string;
    CreatedAt: string;
  };
  commentCount?: number;
  timestamp?: string;
  LeadAssignedDate?: string;
  lastCalled?: string;
}

export default function CampaignDetailsPage() {
  const user = useContext(UserContext);
  const params = useLocalSearchParams();
  const flatListRef = useRef<FlatList>(null);

  // Extract campaign info from params
  const campaignId = params.id as string;
  const campaignName = params.name as string;
  const totalLeads = parseInt(params.totalLeads as string) || 0;
  const pendingLeads = parseInt(params.pendingLeads as string) || 0;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [isLoadingTriggered, setIsLoadingTriggered] = useState(false);

  const leadsPerPage = 20;

  const loadLeads = useCallback(
    async (page = 0, append = false) => {
      if (!user || !campaignId) {
        setError("Invalid campaign or user data");
        setLoading(false);
        return;
      }

      try {
        setError(null);
        if (append) {
          setLoadingMore(true);
        }

        // Use the campaign-specific API with pending-first sorting
        const campaignFilters = {
          campaignName: campaignName,
          page: page + 1, // Convert to 1-based pagination for API
          limit: leadsPerPage,
        };

        const response = await fetchCampaignLeads(campaignFilters);

        if (append) {
          setLeads((prev) => [...prev, ...response.data]);
        } else {
          setLeads(response.data);
        }

        setCurrentPage(page);
        const totalPages = Math.ceil(response.totalLeads / leadsPerPage);
        setHasMorePages(page + 1 < totalPages);
      } catch (error: any) {
        const errorMessage = error?.message || "Failed to load campaign leads";
        setError(errorMessage);

        Toast.show("Failed to load leads", {
          duration: Toast.durations.SHORT,
        });
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user, campaignId, campaignName]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadLeads(0, false); // Reset to page 0
    } finally {
      setRefreshing(false);
    }
  }, [loadLeads]);

  const loadMoreLeads = useCallback(async () => {
    if (loadingMore || !hasMorePages || isLoadingTriggered) {
      return;
    }

    setIsLoadingTriggered(true);
    const nextPage = currentPage + 1;
    await loadLeads(nextPage, true); // Append to existing data
    setIsLoadingTriggered(false);
  }, [loadLeads, loadingMore, hasMorePages, currentPage, isLoadingTriggered]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;

      const paddingToBottom = 300;
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - paddingToBottom;

      if (
        isCloseToBottom &&
        !loadingMore &&
        !isLoadingTriggered &&
        hasMorePages
      ) {
        loadMoreLeads();
      }
    },
    [loadingMore, isLoadingTriggered, hasMorePages, loadMoreLeads]
  );

  const handleLeadPress = useCallback((lead: Lead) => {
    router.push({
      pathname: `/lead-details/${lead._id}`,
      params: {
        fromCalling: "true",
        campaignId,
        campaignName,
      },
    });
  }, [campaignId, campaignName]);

  // Helper function to determine text color based on background color
  const getTextColorForBackground = (backgroundColor: string): string => {
    // Remove # if present
    const hex = backgroundColor.replace("#", "");

    // Convert hex to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return white for dark backgrounds, dark for light backgrounds
    return luminance > 0.6 ? "#1F2937" : "#FFFFFF";
  };

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const renderLeadCard = ({ item: lead }: { item: Lead }) => {
    try {
      // Get status color and text color
      const statusColor = lead.LeadStatus?.color || "#6B7280"; // Default to gray
      const statusTextColor = getTextColorForBackground(statusColor);

      return (
        <TouchableOpacity
          className="flex flex-col bg-white mx-4 mb-3 rounded-xl border border-gray-100 p-4 shadow-sm"
          onPress={() => handleLeadPress(lead)}
          activeOpacity={0.7}
        >
          <View className="flex-row justify-between items-start">
            <View className="flex-1 mr-4">
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                {String(lead.Name || "Unknown Lead")}
              </Text>
            </View>

            {/* Status badge with proper coloring */}
            {lead.LeadStatus && (
              <View className="items-end">
                <View
                  className="px-3 py-1 rounded-full items-center shadow-sm"
                  style={{ backgroundColor: statusColor + "10" }}
                >
                  <Text
                    className="text-xs font-semibold text-center"
                    style={{ color: statusColor }}
                  >
                    {lead.LeadStatus.Status}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View>
            {lead.lastComment?.Content ? (
              <Text className="text-sm line-clamp-2 text-gray-600 leading-relaxed mt-2">
                {lead.lastComment.Content}
              </Text>
            ) : (
              <Text className="text-sm line-clamp-2 text-gray-600 leading-relaxed mt-2">
                {lead.Description}
              </Text>
            )}

            {/* Lead assigned date */}
            {lead.lastComment?.CreatedAt ? (
              <Text className="text-right text-xs text-gray-500">
                {new Date(lead.lastComment.CreatedAt).toLocaleDateString()}
              </Text>
            ) : (
              lead.LeadAssignedDate && (
                <Text className="text-right text-xs text-gray-500">
                  {new Date(lead.LeadAssignedDate).toLocaleDateString()}
                </Text>
              )
            )}
          </View>
        </TouchableOpacity>
      );

      // Original CompactLeadCard - commented out temporarily
      // return <CompactLeadCard lead={item} onPress={() => handleLeadPress(item)} />;
    } catch (error) {
      console.error("Error rendering lead card:", error);
      return (
        <View className="bg-white mx-4 mb-2 rounded-lg border border-red-200 p-3">
          <Text className="text-red-600">
            Error rendering lead: {String(lead.Name || "Unknown")}
          </Text>
        </View>
      );
    }
  };

  const renderHeader = () => (
    <View className="text-right bg-white px-4 pt-3 pb-3 border-b border-gray-100">
      <View className="flex-row items-center justify-end">
        <Ionicons
          name={pendingLeads > 0 ? "time-outline" : "checkmark-circle-outline"}
          size={16}
          color={
            pendingLeads === 0
              ? "#10B981" // Green when no pending leads
              : pendingLeads <= Math.floor(totalLeads * 0.2)
              ? "#F59E0B" // Amber when <= 20% pending
              : "#EF4444" // Red when > 20% pending
          }
        />
        <Text
          className={`text-sm ml-1 font-medium ${
            pendingLeads === 0
              ? "text-emerald-600" // Green when no pending leads
              : pendingLeads <= Math.floor(totalLeads * 0.2)
              ? "text-amber-600" // Amber when <= 20% pending
              : "text-red-600" // Red when > 20% pending
          }`}
        >
          {pendingLeads}/{totalLeads} pending
        </Text>
      </View>
    </View>
  );

  const renderLoadingFooter = () => {
    if (!loadingMore) return null;

    return (
      <View className="py-4 flex-row justify-center items-center">
        <LoadingView />
        <Text className="text-gray-600 ml-2">Loading more leads...</Text>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (error) {
      return (
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="warning-outline" size={64} color="#EF4444" />
          <Text className="text-lg font-medium text-gray-900 mt-4 mb-2">
            Unable to load leads
          </Text>
          <Text className="text-gray-600 text-center mb-4">
            {String(error || "Unknown error")}
          </Text>
          <TouchableOpacity
            className="bg-miles-600 px-4 py-2 rounded-lg"
            onPress={() => {
              setError(null);
              loadLeads();
            }}
          >
            <Text className="text-white font-medium">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="flex-1 justify-center items-center px-6">
        <Ionicons name="person-outline" size={64} color="#9CA3AF" />
        <Text className="text-lg font-medium text-gray-900 mt-4 mb-2">
          No leads found
        </Text>
        <Text className="text-gray-600 text-center">
          This campaign doesn't have any leads yet
        </Text>
      </View>
    );
  };

  // Set the header title immediately with the campaign name from params
  const headerTitle = campaignName || "Campaign Details";

  if (!user) {
    return (
      <>
        <Stack.Screen
          options={{
            title: headerTitle,
            headerShown: true,
          }}
        />
        <View className="flex-1 bg-gray-50 justify-center items-center">
          <LoadingView />
          <Text className="text-gray-600 mt-4">Checking authentication...</Text>
        </View>
      </>
    );
  }

  if (loading && !refreshing) {
    return (
      <>
        <Stack.Screen
          options={{
            title: headerTitle,
            headerShown: true,
          }}
        />
        <View className="flex-1 bg-gray-50 justify-center items-center">
          <LoadingView />
          <Text className="text-gray-600 mt-4">Loading campaign leads...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerShown: true,
        }}
      />
      <View className="flex-1 bg-gray-50">
        <FlatList
          ref={flatListRef}
          data={leads}
          renderItem={renderLeadCard}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderLoadingFooter}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={
            leads.length === 0 ? { flex: 1 } : { paddingBottom: 20 }
          }
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={20}
        />
      </View>
    </>
  );
}
