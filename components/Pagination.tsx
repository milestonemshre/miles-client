import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

/**
 * Props interface for the Pagination component
 */
interface PaginationProps {
  currentPage: number; // Current active page (0-based)
  totalPages: number; // Total number of pages available
  totalItems: number; // Total number of items across all pages
  itemsPerPage: number; // Number of items displayed per page
  onPageChange: (page: number) => void; // Callback when page changes
  loading?: boolean; // Loading state for pagination actions
}

/**
 * Pagination Component
 *
 * A reusable pagination component that provides:
 * - Previous/Next navigation buttons
 * - Numbered page buttons with smart ellipsis handling
 * - Current page highlighting and loading states
 * - Items count display (e.g., "Showing 1-10 of 100 leads")
 *
 * Features:
 * - Auto-hides when only one page or no items
 * - Smart page number display (max 5 pages visible)
 * - Loading indicators during page transitions
 * - Responsive design with proper disabled states
 */
const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  loading = false,
}) => {
  // Early return: Don't render pagination if there's only one page or no items
  if (totalPages <= 1 || totalItems === 0) return null;

  // Calculate the range of items being displayed on current page
  const startItem = currentPage * itemsPerPage + 1;
  const endItem = Math.min((currentPage + 1) * itemsPerPage, totalItems);

  /**
   * Handle Previous button click
   * Only allows navigation if not on first page and not loading
   */
  const handlePrevious = () => {
    if (currentPage > 0 && !loading) onPageChange(currentPage - 1);
  };

  /**
   * Handle Next button click
   * Only allows navigation if not on last page and not loading
   */
  const handleNext = () => {
    if (currentPage < totalPages - 1 && !loading) onPageChange(currentPage + 1);
  };

  /**
   * Handle direct page selection from numbered buttons
   * Validates page bounds and prevents navigation during loading
   */
  const handlePageSelect = (page: number) => {
    if (page !== currentPage && !loading && page >= 0 && page < totalPages)
      onPageChange(page);
  };

  /**
   * Generate visible page numbers with smart ellipsis handling
   *
   * Algorithm:
   * - If total pages <= 5: show all pages
   * - If total pages > 5: show first page, current page range, last page
   * - Use -1 as placeholder for ellipsis (...)
   *
   * Examples:
   * - Pages 1-5: [1, 2, 3, 4, 5]
   * - Page 1 of 20: [1, 2, 3, ..., 20]
   * - Page 10 of 20: [1, ..., 9, 10, 11, ..., 20]
   * - Page 20 of 20: [1, ..., 18, 19, 20]
   */
  const getVisiblePages = () => {
    const maxPages = 5;
    const pages: number[] = [];

    if (totalPages <= maxPages) {
      // Simple case: show all pages when total is small
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Complex case: show strategic pages with ellipsis
      const start = Math.max(0, currentPage - 1); // Show 1 page before current
      const end = Math.min(totalPages - 1, currentPage + 1); // Show 1 page after current

      // Add first page if needed
      if (start > 0) {
        pages.push(0);
        if (start > 1) {
          pages.push(-1); // Add ellipsis if gap exists
        }
      }

      // Add current page range
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      // Add last page if needed
      if (end < totalPages - 1) {
        if (end < totalPages - 2) {
          pages.push(-1); // Add ellipsis if gap exists
        }
        pages.push(totalPages - 1);
      }
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <View className="border-t border-gray-200">
      {/* Overlay */}
      <View className="absolute right-0 left-0 top-0 bottom-0 w-full h-full p-0 mt-0 mb-0 mr-0 ml-0 inset-0 bg-white opacity-90" />

      <View className="p-2 flex-row items-center justify-between">
        <Text className="text-sm text-gray-500 font-medium">
          {itemsPerPage} / {totalItems}
        </Text>
        {/* Previous button */}

        <TouchableOpacity
          className={`flex-row items-center p-2 rounded-lg bg-gray-50 border border-gray-200 gap-1 justify-center ${
            currentPage === 0 || loading ? "opacity-50" : ""
          }`}
          onPress={handlePrevious}
          disabled={currentPage === 0 || loading}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={currentPage === 0 ? "#D1D5DB" : "#6B7280"}
          />
        </TouchableOpacity>

        {/* Page numbers */}
        <View className="flex-row items-center gap-1">
          {visiblePages.map((page, index) => {
            if (page === -1) {
              // Ellipsis
              return (
                <View
                  key={`ellipsis-${index}`}
                  className="w-10 h-10 items-center justify-center"
                >
                  <Text className="text-sm text-gray-400 font-medium">...</Text>
                </View>
              );
            }

            const isCurrentPage = page === currentPage;
            return (
              <TouchableOpacity
                key={page}
                className={`w-10 h-10 rounded-lg border items-center justify-center ${
                  isCurrentPage
                    ? "bg-miles-500 border-miles-500"
                    : "bg-gray-50 border-gray-200"
                } ${loading ? "opacity-50" : ""}`}
                onPress={() => handlePageSelect(page)}
                disabled={loading}
              >
                <Text
                  className={`text-sm font-medium ${
                    isCurrentPage
                      ? "text-white"
                      : loading
                      ? "text-gray-300"
                      : "text-gray-500"
                  }`}
                >
                  {page + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Next button */}
        <TouchableOpacity
          className={`flex-row items-center p-2 rounded-lg bg-gray-50 border border-gray-200 gap-1 justify-center ${
            currentPage === totalPages - 1 || loading ? "opacity-50" : ""
          }`}
          onPress={handleNext}
          disabled={currentPage === totalPages - 1 || loading}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={currentPage === totalPages - 1 ? "#D1D5DB" : "#6B7280"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Pagination;
