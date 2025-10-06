import LoadingView from "@/components/LoadingView";
import { clearAuthData } from "@/services/api/auth";
import {
  fetchCampaignsWithCounts
} from "@/services/campaignApi";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-root-toast";
import { UserContext } from "../_layout";

interface Campaign {
  _id: string;
  Tag: string;
  leadCount: number;
  pendingLeadsCount?: number;
  lastLeadAssignedDate?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function CampaignsTab() {
  const user = useContext(UserContext);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingTriggered, setIsLoadingTriggered] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "leadCount" | "Tag" | "latestAssigned" | "newest"
  >("leadCount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showSortModal, setShowSortModal] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const searchAbortControllerRef = useRef<AbortController | null>(null);

  const loadCampaigns = useCallback(
    async (page = 1, append = false, isSearchOrSort = false) => {
      if (!user) {
        setError("Please log in to view campaigns");
        setLoading(false);
        return;
      }

      // Cancel previous search request if this is a search/sort operation
      if (isSearchOrSort && searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
      }

      // Create new abort controller for search/sort operations
      let abortController: AbortController | null = null;
      if (isSearchOrSort) {
        abortController = new AbortController();
        searchAbortControllerRef.current = abortController;
      }

      try {
        setError(null);

        if (append) {
          setLoadingMore(true);
        } else {
          if (isSearchOrSort) {
            setSearchLoading(true);
          } else {
            setLoading(true);
          }
        }

        const response = await fetchCampaignsWithCounts({
          page,
          limit: 20,
          search: searchQuery,
          sortBy,
          sortOrder,
          signal: abortController?.signal, // Pass abort signal for search/sort operations
        }); // Load 20 items per page
        const { data: campaignsData, pagination: paginationData } = response;

        if (append) {
          // Append new campaigns to existing list with deduplication
          setCampaigns((prev) => {
            const existingTagNames = new Set(prev.map((c) => c.Tag));
            const newCampaigns = campaignsData.filter(
              (c) => !existingTagNames.has(c.Tag)
            );
            return [...prev, ...newCampaigns];
          });
          setLoadingMore(false);
        } else {
          // Replace campaigns (for refresh or initial load)
          setCampaigns(campaignsData);

          // Use setTimeout to delay loading state change until after render
          setTimeout(() => {
            setLoading(false);
            setSearchLoading(false);
          }, 100);
        }

        setPagination(paginationData || null);
        setCurrentPage(page);

        // Clear abort controller reference for search/sort operations
        if (
          isSearchOrSort &&
          searchAbortControllerRef.current === abortController
        ) {
          searchAbortControllerRef.current = null;
        }
      } catch (error: any) {
        // Don't handle aborted requests as errors
        if (
          error?.name === "AbortError" ||
          error?.message?.includes("aborted")
        ) {
          return;
        }

        const errorMessage = error?.message || "Failed to load campaigns";
        setError(errorMessage);

        if (errorMessage.includes("Authentication failed")) {
          Toast.show("Session expired. Please login again.", {
            duration: Toast.durations.LONG,
          });

          await clearAuthData();
        } else if (errorMessage.includes("Network request failed")) {
          Toast.show(
            "Cannot connect to server. Please check your connection.",
            {
              duration: Toast.durations.LONG,
            }
          );
          // Network errors don't require clearing auth - user can retry when connection is restored
        } else {
          Toast.show("Failed to load campaigns", {
            duration: Toast.durations.SHORT,
          });
        }

        // Set all loading states to false on error
        setLoading(false);
        setLoadingMore(false);
        setSearchLoading(false);
      }
    },
    [user, searchQuery, sortBy, sortOrder]
  );

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCampaigns(1, false); // Reset to page 1
    } finally {
      setRefreshing(false);
    }
  }, [loadCampaigns]);

  const loadMoreCampaigns = useCallback(async () => {
    if (loadingMore || !pagination?.hasNextPage || isLoadingTriggered) {
      return;
    }

    setIsLoadingTriggered(true);
    const nextPage = currentPage + 1;
    await loadCampaigns(nextPage, true); // Append to existing data
    setIsLoadingTriggered(false);
  }, [loadCampaigns, loadingMore, pagination, currentPage, isLoadingTriggered]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;

      // Calculate how much of the content has been scrolled
      const paddingToBottom = 500; // Start loading when 300px from bottom
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - paddingToBottom;

      const distanceFromBottom =
        contentSize.height - (layoutMeasurement.height + contentOffset.y);

      // Trigger loading when close to bottom and not already loading
      if (
        isCloseToBottom &&
        !loadingMore &&
        !isLoadingTriggered &&
        pagination?.hasNextPage
      ) {
        loadMoreCampaigns();
      }
    },
    [
      loadingMore,
      isLoadingTriggered,
      pagination,
      loadMoreCampaigns,
      currentPage,
    ]
  );

  const handleCampaignPress = useCallback((campaign: Campaign) => {
    // Navigate to dedicated campaign details page
    router.push({
      pathname: `/campaign-details/${campaign._id}`,
      params: {
        name: campaign.Tag,
        totalLeads: campaign.leadCount.toString(),
        pendingLeads: (campaign.pendingLeadsCount || 0).toString(),
      },
    });
  }, []);

  const handleStartCalling = useCallback(
    (campaign: Campaign, event?: any) => {
      // Prevent the card press event from firing (guard for RN where event may be undefined)
      if (event?.stopPropagation) {
        event.stopPropagation();
      }

      // Navigate directly to lead page in calling mode with a temporary id
      router.push({
        pathname: "/lead-details/auto",
        params: {
          fromCalling: "true",
          campaignId: campaign._id,
          campaignName: campaign.Tag,
        },
      });
    },
    []
  );

  useEffect(() => {
    loadCampaigns();

    // Cleanup function to cancel any pending requests
    return () => {
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
        searchAbortControllerRef.current = null;
      }
    };
  }, [loadCampaigns]);

  // Date formatting utility
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";

      const now = new Date();
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
      }
      if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return months === 1 ? "1 month ago" : `${months} months ago`;
      }
      const years = Math.floor(diffDays / 365);
      return years === 1 ? "1 year ago" : `${years} years ago`;
    } catch (error) {
      return "N/A";
    }
  };

  // Debounced search effect
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (searchQuery.trim() !== "" || campaigns.length > 0) {
        setCurrentPage(1);
        loadCampaigns(1, false, true); // Mark as search/sort operation
      }
    }, 500);

    return () => {
      clearTimeout(searchTimeout);
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
      }
    };
  }, [searchQuery]);

  const renderCampaignCard = ({ item }: { item: Campaign }) => (
    <View className="bg-white mx-4 mb-3 rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <View className="flex-row">
        {/* Main card content - touchable area */}
        <TouchableOpacity
          className="flex-1 p-4"
          onPress={() => handleCampaignPress(item)}
          activeOpacity={0.7}
        >
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="text-lg font-semibold text-gray-900 mb-1">
                  {item.Tag}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#9CA3AF"
                  className="ml-1"
                />
              </View>
              {/* Pending leads indicator */}
              {item.pendingLeadsCount !== undefined && (
                <View className="flex-row items-center mt-1">
                  <Ionicons
                    name={
                      item.pendingLeadsCount > 0
                        ? "time-outline"
                        : "checkmark-circle-outline"
                    }
                    size={16}
                    color={
                      item.pendingLeadsCount === 0
                        ? "#10B981" // Green when no pending leads
                        : item.pendingLeadsCount <=
                          Math.floor(item.leadCount * 0.2)
                        ? "#F59E0B" // Amber when <= 20% pending
                        : "#EF4444" // Red when > 20% pending
                    }
                  />
                  <Text
                    className={`text-sm ml-2 font-medium ${
                      item.pendingLeadsCount === 0
                        ? "text-emerald-600" // Green when no pending leads
                        : item.pendingLeadsCount <=
                          Math.floor(item.leadCount * 0.2)
                        ? "text-amber-600" // Amber when <= 20% pending
                        : "text-red-600" // Red when > 20% pending
                    }`}
                  >
                    {item.pendingLeadsCount}/{item.leadCount} pending
                  </Text>
                </View>
              )}

              <View className="mt-2">
                {/* Last Lead Assigned Date */}
                <View className="flex-row items-center">
                  <Ionicons
                    name="person-add-outline"
                    size={14}
                    color="#6B7280"
                  />
                  <Text className="text-xs text-gray-600 ml-2">
                    Last assigned lead:{" "}
                    <Text className="font-medium">
                      {formatDate(item.lastLeadAssignedDate)}
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Start Calling button - separate touchable area */}
        <TouchableOpacity
          className="w-20 bg-miles-500 flex justify-center items-center"
          onPress={(event) => handleStartCalling(item, event)}
          activeOpacity={0.8}
        >
          <Ionicons name="call" size={20} color="white" />
          <Text className="text-white text-xs font-medium mt-1 text-center">
            Start{"\n"}Calling
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => {
    if (loading && campaigns.length === 0) {
      return null;
    }

    if (error) {
      const isNetworkError = error.includes("Network request failed");
      const isAuthError = error.includes("Authentication failed");

      return (
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="warning-outline" size={64} color="#EF4444" />
          <Text className="text-lg font-medium text-gray-900 mt-4 mb-2">
            {isNetworkError
              ? "Connection Issue"
              : isAuthError
              ? "Authentication Issue"
              : "Unable to load campaigns"}
          </Text>
          <Text className="text-gray-600 text-center mb-4">
            {isNetworkError
              ? "Cannot connect to server. Please check your internet connection and try again."
              : isAuthError
              ? "Your session has expired. Please log in again."
              : error}
          </Text>
          {(isNetworkError || (!isNetworkError && !isAuthError)) && (
            <TouchableOpacity
              className="bg-miles-600 px-4 py-2 rounded-lg"
              onPress={() => {
                setError(null);
                loadCampaigns();
              }}
            >
              <Text className="text-white font-medium">Try Again</Text>
            </TouchableOpacity>
          )}
          {isAuthError && (
            <View className="flex-row items-center mt-2">
              <LoadingView />
              <Text className="text-sm text-gray-500 ml-2">
                Clearing authentication...
              </Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <View className="flex-1 justify-center items-center px-6">
        <Ionicons name="pricetags-outline" size={64} color="#9CA3AF" />
        <Text className="text-lg font-medium text-gray-900 mt-4 mb-2">
          No campaigns found
        </Text>
        <Text className="text-gray-600 text-center">
          Campaigns will appear here once tags are added to leads
        </Text>
      </View>
    );
  };

  const renderLoadingFooter = () => {
    if (!loadingMore) return null;

    return (
      <View className="py-4 flex-row justify-center items-center">
        <LoadingView />
        <Text className="text-gray-600 ml-2">Loading more campaigns...</Text>
      </View>
    );
  };

  // Show loading state only when not authenticated
  if (!user) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <LoadingView />
        <Text className="text-gray-600 mt-4">Checking authentication...</Text>
      </View>
    );
  }

  // Render the loading state inside the content area instead of replacing everything
  const renderMainContent = () => {
    if (loading && !refreshing && campaigns.length === 0) {
      return (
        <View className="flex-1 justify-center items-center">
          <LoadingView />
          <Text className="text-gray-600 mt-4">Loading campaigns...</Text>
        </View>
      );
    }

    return (
      <FlatList
        ref={flatListRef}
        data={campaigns}
        renderItem={renderCampaignCard}
        keyExtractor={(item, index) => `${item._id || item.Tag}-${index}`}
        ListEmptyComponent={() => {
          return !loading && campaigns.length === 0 ? renderEmptyState() : null;
        }}
        ListFooterComponent={renderLoadingFooter}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={
          campaigns.length === 0 && !loading
            ? { flex: 1 }
            : { paddingBottom: 20, paddingTop: 20 }
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={20}
      />
    );
  };

  const getSortLabel = () => {
    const labels = {
      Tag: "A-Z",
      leadCount: "Lead Count",
      latestAssigned: "Latest Assigned",
      newest: "Newest Campaign",
    };
    return labels[sortBy];
  };

  const handleSortSelection = (
    value: "leadCount" | "Tag" | "latestAssigned" | "newest"
  ) => {
    if (sortBy === value) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(value);
      setSortOrder(
        value === "leadCount" || value === "newest" ? "desc" : "asc"
      );
    }
    setCurrentPage(1);
    loadCampaigns(1, false, true); // Mark as search/sort operation
    setShowSortModal(false);
  };

  const renderSortModalOption = (
    value: "leadCount" | "Tag" | "latestAssigned" | "newest",
    label: string,
    icon: string
  ) => (
    <TouchableOpacity
      key={value}
      className={`flex-row items-center justify-between px-4 py-4 border-b border-gray-100 ${
        sortBy === value ? "bg-miles-50" : "bg-white"
      }`}
      onPress={() => handleSortSelection(value)}
    >
      <View className="flex-row items-center">
        <Ionicons
          name={icon as any}
          size={20}
          color={sortBy === value ? "#059669" : "#6B7280"}
        />
        <Text
          className={`text-base font-medium ml-3 ${
            sortBy === value ? "text-miles-700" : "text-gray-900"
          }`}
        >
          {label}
        </Text>
      </View>
      <View className="flex-row items-center">
        {sortBy === value && (
          <Text className="text-sm text-miles-600 mr-2">
            {sortOrder === "asc" ? "↑" : "↓"}
          </Text>
        )}
        {sortBy === value && (
          <Ionicons name="checkmark-circle" size={20} color="#059669" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Search and Sort Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        {/* Search Input with Sort Button */}
        <View className="flex-row items-center gap-3">
          <View className="flex-1 flex-row items-center bg-gray-50 rounded-lg px-3 py-2">
            <Ionicons name="search" size={20} color="#6B7280" />
            <TextInput
              className="flex-1 ml-3 text-gray-900"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => {
                setCurrentPage(1);
                loadCampaigns(1, false, true); // Mark as search/sort operation
              }}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                  loadCampaigns(1, false, true); // Mark as search/sort operation
                }}
              >
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Sort Button */}
          <TouchableOpacity
            className="bg-miles-50 px-3 py-2 rounded-lg border border-miles-200 flex-row items-center"
            onPress={() => setShowSortModal(true)}
          >
            <Ionicons name="funnel-outline" size={18} color="#059669" />
            <Text className="text-miles-700 text-sm font-medium ml-1">
              Sort
            </Text>
            {sortOrder === "asc" ? (
              <Ionicons
                name="chevron-up"
                size={12}
                color="#059669"
                className="ml-1"
              />
            ) : (
              <Ionicons
                name="chevron-down"
                size={12}
                color="#059669"
                className="ml-1"
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Search Loading Indicator */}
        {searchLoading && (
          <View className="flex-row items-center justify-center mt-3 py-2">
            <LoadingView />
            <Text className="text-gray-600 ml-2 text-sm">
              Searching campaigns...
            </Text>
          </View>
        )}
      </View>

      {/* Main Content */}
      {renderMainContent()}

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSortModal(false)}
      >
        <View className="flex-1 bg-black/50">
          <View className="flex-1 bg-white">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
              <Text className="text-lg font-semibold text-gray-900">
                Sort Campaigns
              </Text>
              <TouchableOpacity
                onPress={() => setShowSortModal(false)}
                className="p-2"
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Sort Options */}
            <View className="flex-1 bg-white">
              {renderSortModalOption(
                "Tag",
                "A-Z (Alphabetical)",
                "text-outline"
              )}
              {renderSortModalOption(
                "leadCount",
                "Lead Count",
                "bar-chart-outline"
              )}
              {renderSortModalOption(
                "newest",
                "Newest Campaign",
                "calendar-outline"
              )}
              {renderSortModalOption(
                "latestAssigned",
                "Latest Assigned Lead",
                "time-outline"
              )}
            </View>

            {/* Current Sort Info */}
            <View className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <Text className="text-sm text-gray-600">
                Currently sorting by{" "}
                <Text className="font-medium text-miles-700">
                  {getSortLabel()}
                </Text>{" "}
                {sortOrder === "asc" ? "(ascending ↑)" : "(descending ↓)"}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
