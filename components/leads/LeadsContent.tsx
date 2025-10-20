import { FilterOption, FilterOptions } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LeadCard from "../LeadCard";
import LoadingView from "../LoadingView";
import Pagination from "../Pagination";
import StatusCounts from "../StatusCounts";

interface LeadsContentProps {
  loading: boolean;
  leads: any[];
  localLeads: any[];
  searchTerm: string;
  filters: FilterOptions;
  statusOptions: FilterOption[];
  sourceOptions: FilterOption[];
  statusCounts: { [key: string]: { count: number; filteredCount: number } };
  statusCountsLoading: boolean;
  statusCountsExpanded: boolean;
  selectedLeads: any[];
  userPermissions: any;
  leadCardRefs: React.MutableRefObject<{ [key: string]: View | null }>;
  scrollViewRef: React.RefObject<ScrollView>;
  currentPage: number;
  totalPages: number;
  totalLeads: number;
  leadsPerPage: number;
  miles600: string;
  onStatusCountsExpandedChange: (expanded: boolean) => void;
  onStatusFilter: (statusId: string) => void;
  onClearStatusFilter: () => void;
  onLeadUpdate: (leadId: string, updates: any) => Promise<void>;
  onPageChange: (page: number) => void;
  onModalOpen: (type: string, leadId: string, callback: () => void) => void;
  onCallStatusUpdateModalOpen?: (lead: any, preSelectedStatusId?: string) => void;
  isLeadSelected: (lead: any) => boolean;
  toggleLeadSelection: (lead: any) => void;
  scrollToCard: (leadId: string) => void;
  setSearchTerm: (term: string) => void;
  updateFilters: (filters: FilterOptions) => void;
  setCurrentPage: (page: number) => void;
}

export default function LeadsContent({
  loading,
  leads,
  localLeads,
  searchTerm,
  filters,
  statusOptions,
  sourceOptions,
  statusCounts,
  statusCountsLoading,
  statusCountsExpanded,
  selectedLeads,
  userPermissions,
  leadCardRefs,
  scrollViewRef,
  currentPage,
  totalPages,
  totalLeads,
  leadsPerPage,
  onStatusCountsExpandedChange,
  onStatusFilter,
  onClearStatusFilter,
  onLeadUpdate,
  onPageChange,
  onModalOpen,
  onCallStatusUpdateModalOpen,
  isLeadSelected,
  toggleLeadSelection,
  scrollToCard,
  setSearchTerm,
}: LeadsContentProps) {
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center gap-4">
        <LoadingView />
        <Text className="text-base text-gray-500">Loading leads...</Text>
      </View>
    );
  }

  if (!leads?.length) {
    return (
      <View className="flex-1 justify-center items-center px-8 py-16">
        <View className="items-center max-w-72">
          <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
          <Text className="text-xl font-semibold text-gray-700 mt-4 mb-2 text-center">
            No Leads Found
          </Text>
          <Text className="text-base text-gray-500 text-center leading-6 mb-6">
            {searchTerm
              ? `No leads match your search "${searchTerm}"`
              : "No leads are available at the moment"}
          </Text>
          {searchTerm && (
            <TouchableOpacity
              className="bg-miles-500 px-5 py-2.5 rounded-lg mt-2"
              onPress={() => setSearchTerm("")}
            >
              <Text className="text-white text-sm font-medium">
                Clear Search
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Status counts display */}
        <StatusCounts
          statusOptions={statusOptions}
          statusCounts={statusCounts}
          statusCountsLoading={statusCountsLoading}
          statusCountsExpanded={statusCountsExpanded}
          onStatusCountsExpandedChange={onStatusCountsExpandedChange}
          onStatusFilter={onStatusFilter}
          onClearStatusFilter={onClearStatusFilter}
          selectedStatuses={filters.selectedStatuses || []}
          dateRange={filters.dateRange || []}
        />

        <View className="px-4">
          {localLeads.map((lead, index) => (
            <View
              key={lead._id || index}
              ref={(ref) => {
                if (ref) {
                  leadCardRefs.current[lead._id] = ref;
                }
              }}
            >
              <LeadCard
                lead={lead}
                selected={isLeadSelected(lead)}
                onCardPress={() => toggleLeadSelection(lead)}
                onDetailsPress={() => {
                  // Navigate to lead details page
                }}
                statusOptions={statusOptions}
                sourceOptions={sourceOptions}
                onLeadUpdate={onLeadUpdate}
                userPermissions={userPermissions}
                scrollToCard={scrollToCard}
                onOpenModal={(type, callback) => {
                  onModalOpen(type, lead._id, callback);
                }}
                onCallStatusUpdateModalOpen={(preSelectedStatusId) => onCallStatusUpdateModalOpen?.(lead, preSelectedStatusId)}
              />
            </View>
          ))}

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalLeads}
            itemsPerPage={leadsPerPage}
            onPageChange={onPageChange}
            loading={loading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
