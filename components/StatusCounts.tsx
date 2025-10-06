import React, { useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface StatusCountsProps {
  statusOptions: any[];
  statusCounts: { [key: string]: { count: number; filteredCount: number } };
  statusCountsLoading: boolean;
  statusCountsExpanded: boolean;
  onStatusCountsExpandedChange: (expanded: boolean) => void;
  onStatusFilter: (statusValue: string) => void;
  onClearStatusFilter: () => void;
  selectedStatuses: string[];
  dateRange: any[];
}
const StatusCounts: React.FC<StatusCountsProps> = ({
  statusOptions,
  statusCounts,
  statusCountsLoading,
  statusCountsExpanded,
  onStatusCountsExpandedChange,
  onStatusFilter,
  onClearStatusFilter,
  selectedStatuses,
}) => {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<View>(null);

  const handleContentLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    // Check if content height exceeds the collapsed height (24px = max-h-6)
    const maxCollapsedHeight = 24;
    setIsOverflowing(height > maxCollapsedHeight);
  };

  const statusBadgeContent = (status: any) => {
    const statusData = statusCounts[status.value];
    const count = statusData?.count || 0;
    const filteredCount = statusData?.filteredCount || 0;

    if (count !== filteredCount) {
      return (
        <View className="flex-row items-baseline">
          <Text className="text-xs text-miles-800">{status.label}:</Text>
          <Text className="text-xs font-bold text-miles-800">
            {filteredCount}
          </Text>
          <Text className="text-gray-400 text-[10px]">/{count}</Text>
        </View>
      );
    }

    return (
      <View className="flex-row items-baseline">
        <Text className="text-xs text-miles-800">{status.label}:</Text>
        <Text className="text-xs font-bold text-miles-800">{count}</Text>
      </View>
    );
  };

  // Sort statusOptions to show ones with counts first, then others
  const sortedStatusOptions = [...statusOptions].sort((a, b) => {
    const aData = statusCounts[a.value];
    const bData = statusCounts[b.value];
    const aCount = (aData?.count || 0) + (aData?.filteredCount || 0);
    const bCount = (bData?.count || 0) + (bData?.filteredCount || 0);

    // If both have counts or both don't, maintain original order
    if ((aCount > 0 && bCount > 0) || (aCount === 0 && bCount === 0)) {
      return 0;
    }
    // Show ones with counts first
    return bCount - aCount;
  });

  return (
    <View className="mx-4 my-4">
      <View
        className={`relative ${
          statusCountsExpanded ? "max-h-40" : "max-h-6 overflow-hidden"
        }`}
        style={{ paddingRight: 70 }}
      >
        {statusCountsLoading ? (
          <Text className="text-gray-500 text-sm">Loading...</Text>
        ) : (
          <View
            ref={contentRef}
            className="flex-row flex-wrap"
            style={{ gap: 8 }}
            onLayout={handleContentLayout}
          >
            {/* Clear filter button if any status is selected */}
            {selectedStatuses.length > 0 && (
              <TouchableOpacity
                className="px-1.5 py-0.5 rounded-full border border-gray-300 bg-gray-100"
                onPress={onClearStatusFilter}
              >
                <View className="flex-row items-center">
                  <Text className="text-xs text-gray-600">Clear</Text>
                  <Text className="text-xs text-gray-600 ml-1">×</Text>
                </View>
              </TouchableOpacity>
            )}

            {sortedStatusOptions.map((status) => {
              const isSelected = selectedStatuses.includes(status.value);

              return (
                <TouchableOpacity
                  key={status.value}
                  className={`px-1.5 py-0.5 rounded-full border ${
                    isSelected ? "border-miles-500 bg-miles-100" : ""
                  }`}
                  style={
                    !isSelected
                      ? {
                          backgroundColor: (status.color || "#3B82F6") + "16",
                          borderColor: (status.color || "#3B82F6") + "44",
                        }
                      : {}
                  }
                  onPress={() => onStatusFilter(status.value)}
                >
                  {statusBadgeContent(status)}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Expand/collapse button - only show when content overflows */}
        {isOverflowing && (
          <TouchableOpacity
            className="absolute right-0 top-0 px-1 py-0.5 rounded"
            onPress={() => onStatusCountsExpandedChange(!statusCountsExpanded)}
            style={{ zIndex: 10 }}
          >
            <Text className="text-xs text-miles-500">
              {statusCountsExpanded ? "Less" : "More"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default StatusCounts;
