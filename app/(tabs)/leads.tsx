import ActionButtons from "@/components/ActionButtons";
import BulkModal from "@/components/BulkModal";
import FiltersModal from "@/components/FiltersModal";
import LeadsContent from "@/components/leads/LeadsContent";
import LeadsHeader from "@/components/leads/LeadsHeader";
import LeadTypeModal from "@/components/leads/LeadTypeModal";
import LoadingView from "@/components/LoadingView";
import MeetingModal from "@/components/MeetingModal";
import ReminderModal from "@/components/ReminderModal";

import { useFilters } from "@/hooks/useFilters";
import { useLeadsData } from "@/hooks/useLeadsData";
import { useLeadsSelection } from "@/hooks/useLeadsSelection";
import { useNavigationHeader } from "@/hooks/useNavigationHeader";
import { usePagination } from "@/hooks/usePagination";
import { useSearchDebounce } from "@/hooks/useSearchDebounce";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useContext, useEffect, useRef, useState } from "react";

import { ScrollView, View } from "react-native";

import Toast from "react-native-root-toast";
import resolveConfig from "tailwindcss/resolveConfig";
import tailwindConfig from "../../tailwind.config";

import { UserContext } from "../_layout";

import { LeadType } from "@/components/LeadTypeDropdown";
import {
  ACTION_BUTTONS_HEIGHT,
  CALLBACK_DELAY,
  HEADER_HEIGHT,
  MODAL_CLOSE_DELAY_LONG,
  MODAL_CLOSE_DELAY_SHORT,
  SCROLL_PADDING,
} from "@/constants/ui";
import useAgentInitialization from "@/hooks/useAgentInitialization";
import useModalManager from "@/hooks/useModalManager";
import useUserPermissions from "@/hooks/useUserPermissions";
import {
  deleteLeads,
  exportLeads,
  fetchStatusCounts,
  fetchTagOptions,
  updateLead,
} from "@/services/api";
import {
  getFlattenedAgents,
  getUsersFromAgents,
  processAgentsForFilters,
} from "@/utils/agents";
import {
  COUNT_OPTIONS,
  DEFAULT_PAGINATION,
  SEARCH_BOX_OPTIONS,
} from "@/utils/constants";
import ModalManager from "@/utils/ModalManager";

const fullConfig = resolveConfig(tailwindConfig);
const miles600 = fullConfig.theme.colors.miles[600];

export default function LeadsPage() {
  const user = useContext(UserContext);
  const params = useLocalSearchParams();

  const { searchTerm, setSearchTerm } = useSearchDebounce({
    delay: DEFAULT_PAGINATION.DEBOUNCE_DELAY,
  });

  const { filters, updateFilters } = useFilters();

  const { currentPage, leadsPerPage, setCurrentPage, setLeadsPerPage } =
    usePagination({
      initialPage: DEFAULT_PAGINATION.PAGE,
      initialPageSize: DEFAULT_PAGINATION.PAGE_SIZE,
    });

  const {
    selectedLeads,
    toggleLeadSelection,
    clearSelection,
    selectAll,
    isLeadSelected,
  } = useLeadsSelection();

  const {
    leads,
    totalLeads,
    totalPages,
    statusOptions,
    sourceOptions,
    tagOptions,
    agents,
    loading,
    paginationLoading,
    refreshLeads,
    setPaginationLoading,
  } = useLeadsData({
    user,
    filters,
    searchTerm,
    currentPage,
    leadsPerPage,
    shouldFetchLeads: filters.selectedAgents.length > 0,
  });

  const [localLeads, setLocalLeads] = useState<any[]>([]);

  const {
    showReminderModal,
    reminderLeadId,
    reminderCallback,
    openReminderModal,
    closeReminderModal,
    showMeetingModal,
    meetingLeadId,
    meetingCallback,
    openMeetingModal,
    closeMeetingModal,
    showBulkModal,
    setShowBulkModal,
    showFilters,
    setShowFilters,
    headerDropdownOpen,
    setHeaderDropdownOpen,
  } = useModalManager();

  const [isExporting, setIsExporting] = useState(false);
  const [statusCountsExpanded, setStatusCountsExpanded] = useState(false);
  const [statusCounts, setStatusCounts] = useState<{
    [key: string]: { count: number; filteredCount: number };
  }>({});
  const [statusCountsLoading, setStatusCountsLoading] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const leadCardRefs = useRef<{ [key: string]: View | null }>({});

  useNavigationHeader({
    leadType: filters.leadType || "marketing",
    onHeaderPress: () => setHeaderDropdownOpen(true),
  });

  const userPermissions = useUserPermissions(user);

  useEffect(() => {
    setLocalLeads(leads);
  }, [leads]);

  useAgentInitialization({ agents, user, filters, updateFilters });

  // Handle campaign filtering from URL params
  useEffect(() => {
    if (params.selectedTags && typeof params.selectedTags === "string") {
      try {
        const tags = JSON.parse(params.selectedTags);
        if (Array.isArray(tags) && tags.length > 0) {
          const newFilters = {
            ...filters,
            selectedTags: tags,
          };
          updateFilters(newFilters);
          setCurrentPage(0);

          // Show toast if campaign name is provided
          if (params.campaignName && typeof params.campaignName === "string") {
            Toast.show(`Filtering by campaign: ${params.campaignName}`, {
              duration: Toast.durations.SHORT,
            });
          }
        }
      } catch (error) {
        console.error("Error parsing selectedTags param:", error);
      }
    }
  }, [params.selectedTags, params.campaignName]);

  const handleFiltersChange = (newFilters: any) => {
    updateFilters({ ...newFilters, searchTerm });
    setCurrentPage(0);

    if (newFilters.searchTerm !== searchTerm)
      setSearchTerm(newFilters.searchTerm);
  };

  const handlePageChange = async (newPage: number) => {
    if (newPage === currentPage || paginationLoading) return;

    setPaginationLoading(true);
    setCurrentPage(newPage);

    try {
      await refreshLeads();
    } catch (error) {
      console.error(error);
      Toast.show("Error loading page", {
        duration: Toast.durations.SHORT,
      });
    } finally {
      setPaginationLoading(false);
    }
  };

  const handleLeadsDataChange = (data: any) => {
    setLeadsPerPage(data.leadsPerPage);
    setCurrentPage(data.currentPage - 1);
  };

  const handleLeadTypeChange = useCallback(
    (leadType: LeadType) => {
      let newSelectedSources: string[] = [];

      if (leadType === "community") {
        const communitySource = sourceOptions.find((source) =>
          source.label.toLowerCase().includes("lead")
        );
        if (communitySource) {
          newSelectedSources = [communitySource.value];
        }
      } else {
        // For marketing, select all sources except the "leads" source
        newSelectedSources = sourceOptions
          .filter((source) => !source.label.toLowerCase().includes("lead"))
          .map((source) => source.value);
      }

      const newFilters = {
        ...filters,
        leadType,
        selectedSources: newSelectedSources,
      };

      updateFilters(newFilters);
      setCurrentPage(0);
    },
    [filters, sourceOptions, updateFilters]
  );

  const handleSelectAll = useCallback(() => {
    if (selectedLeads.length === localLeads.length && localLeads.length > 0) {
      clearSelection();
    } else {
      selectAll(localLeads);
    }
  }, [selectedLeads.length, localLeads, clearSelection, selectAll]);

  const showExportSuccess = useCallback((selectedCount: number) => {
    const message =
      selectedCount > 0
        ? `${selectedCount} leads exported successfully`
        : "Leads exported successfully";
    Toast.show(message, { duration: Toast.durations.SHORT });
  }, []);

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);

      let blob: Blob;
      if (selectedLeads.length > 0) {
        const leadIds = selectedLeads.map((lead) => lead._id);
        blob = await exportLeads(leadIds, undefined, undefined, "cold");
      } else {
        blob = await exportLeads(undefined, filters, user, "cold");
      }

      showExportSuccess(selectedLeads.length);
    } catch (error) {
      console.error(error);
      Toast.show(`Export failed: ${error.message}`, {
        duration: Toast.durations.LONG,
      });
    } finally {
      setIsExporting(false);
    }
  }, [selectedLeads, filters, user, showExportSuccess]);

  const handleDelete = useCallback(async () => {
    if (selectedLeads.length === 0) return;

    try {
      const leadIds = selectedLeads.map((lead) => lead._id);
      await deleteLeads(leadIds);

      setLocalLeads((prevLeads) =>
        prevLeads.filter((lead) => !leadIds.includes(lead._id))
      );
      clearSelection();
      // Note: Removed refreshLeads() since we already updated local state

      Toast.show(
        `${leadIds.length} lead${
          leadIds.length > 1 ? "s" : ""
        } deleted successfully`,
        {
          duration: Toast.durations.SHORT,
        }
      );
    } catch (error) {
      console.error(error);
      Toast.show(`Delete failed: ${error.message}`, {
        duration: Toast.durations.LONG,
      });
    }
  }, [selectedLeads, clearSelection]);

  const handleBulkActions = useCallback(() => {
    if (selectedLeads.length === 0) {
      Toast.show("Please select leads for bulk actions", {
        duration: Toast.durations.SHORT,
      });
      return;
    }

    setShowBulkModal(true);
  }, [selectedLeads.length]);

  const handleBulkOperationComplete = useCallback(async () => {
    clearSelection();
    await refreshLeads();
  }, [clearSelection, refreshLeads]);

  const handleHistory = useCallback(() => {
    Toast.show("History feature coming soon", {
      duration: Toast.durations.SHORT,
    });
  }, []);

  const handleDealSubmission = useCallback(() => {
    if (selectedLeads.length !== 1) return;

    const selectedLead = selectedLeads[0];
    if (selectedLead.LeadStatus?.Status !== "Closure") return;

    Toast.show(
      `Opening deal submission for ${selectedLead.Name || "selected lead"}`,
      {
        duration: Toast.durations.SHORT,
      }
    );
  }, [selectedLeads]);

  const handleStatusFilter = useCallback(
    (statusValue: string) => {
      const currentSelectedStatuses = filters.selectedStatuses || [];
      let newSelectedStatuses;

      if (currentSelectedStatuses.includes(statusValue)) {
        newSelectedStatuses = currentSelectedStatuses.filter(
          (status) => status !== statusValue
        );
      } else {
        newSelectedStatuses = [...currentSelectedStatuses, statusValue];
      }

      const newFilters = {
        ...filters,
        selectedStatuses: newSelectedStatuses,
      };
      updateFilters(newFilters);
      setCurrentPage(0);

      if (!statusCountsExpanded) {
        setStatusCountsExpanded(true);
      }
    },
    [filters, updateFilters, setCurrentPage, statusCountsExpanded]
  );

  useEffect(() => {
    if (!user) return;

    const fetchStatusCountsData = async () => {
      setStatusCountsLoading(true);
      try {
        const statusCountsData = await fetchStatusCounts(
          user,
          filters,
          searchTerm
        );
        setStatusCounts(statusCountsData);
      } catch (error) {
        console.error(error);
        setStatusCounts({});
      } finally {
        setStatusCountsLoading(false);
      }
    };

    fetchStatusCountsData();
  }, [
    user,
    filters.selectedAgents,
    filters.selectedStatuses,
    filters.selectedSources,
    filters.selectedTags,
    filters.dateRange,
    filters.dateFor,
    filters.searchBoxFilters,
    searchTerm,
  ]);

  /**
   * Handle lead update from LeadCard component
   */
  const handleLeadUpdate = useCallback(
    async (leadId: string, updates: any) => {
      try {
        await updateLead(leadId, updates);

        setLocalLeads((prevLeads) =>
          prevLeads.map((lead) => {
            if (lead._id === leadId) {
              const updatedLead = { ...lead, ...updates };

              // Update lastCalled timestamp if there's a status change or comment
              if (
                updates.updateDescription ||
                (updates.LeadStatus &&
                  updates.LeadStatus._id !== lead.LeadStatus?._id)
              ) {
                updatedLead.lastCalled = Date.now();
              }

              // If there's an update description, create a new lastComment
              if (
                updates.updateDescription &&
                updates.updateDescription.trim()
              ) {
                updatedLead.lastComment = {
                  Content: updates.updateDescription,
                  UserId: user.id,
                  timestamp: Date.now(),
                  // Add user info if available for display
                  User: {
                    username: user.username || user.name || "Current User",
                  },
                };
                // Increment the visible comment count
                updatedLead.visibleCommentCount =
                  (lead.visibleCommentCount || 0) + 1;
              }

              return updatedLead;
            }
            return lead;
          })
        );

        Toast.show("Lead updated successfully", {
          duration: Toast.durations.SHORT,
        });

        // Note: Removed refreshLeads() call to avoid unnecessary network request
      } catch (error) {
        console.error("Failed to update lead:", error);
        Toast.show(`Failed to update lead: ${error.message}`, {
          duration: Toast.durations.LONG,
        });
        throw error;
      }
    },
    [user]
  );

  const scrollToCard = useCallback((leadId: string) => {
    const cardRef = leadCardRefs.current[leadId];
    const scrollView = scrollViewRef.current;

    if (!cardRef || !scrollView) {
      console.warn("❌ Missing refs for scrolling:", {
        cardRef: !!cardRef,
        scrollView: !!scrollView,
      });
      return;
    }

    cardRef.measureLayout(
      scrollView as any,
      (x, y, width, height) => {
        const totalOffset =
          HEADER_HEIGHT + ACTION_BUTTONS_HEIGHT + SCROLL_PADDING;

        const targetY = Math.max(0, y - totalOffset);

        scrollView.scrollTo({
          y: targetY,
          animated: true,
        });
      },
      (error) => {
        console.warn("❌ measureLayout failed, trying measureInWindow:", error);

        cardRef.measureInWindow((x, y, width, height) => {
          scrollView.scrollTo({ y: 0, animated: false });

          setTimeout(() => {
            cardRef.measureInWindow((newX, newY, newWidth, newHeight) => {
              const targetScrollY = Math.max(0, newY - 200);

              scrollView.scrollTo({
                y: targetScrollY,
                animated: true,
              });
            });
          }, MODAL_CLOSE_DELAY_SHORT / 2);
        });
      }
    );
  }, []);

  if (!user) return <LoadingView />;

  return (
    <View className="flex-1 bg-gray-50">
      <LeadsHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onFiltersPress={() => setShowFilters(true)}
        selectedLeads={selectedLeads}
        onClearSelection={clearSelection}
      />

      {!loading && leads?.length > 0 && (
        <ActionButtons
          selectedLeads={selectedLeads}
          totalLeads={localLeads.length}
          onSelectAll={handleSelectAll}
          onClearSelection={clearSelection}
          onExport={userPermissions.export ? handleExport : undefined}
          onDelete={userPermissions.delete ? handleDelete : undefined}
          onBulkActions={
            userPermissions.mapLeads ? handleBulkActions : undefined
          }
          onHistory={userPermissions.mapLeads ? handleHistory : undefined}
          onDealSubmission={handleDealSubmission}
          isExporting={isExporting}
          userPermissions={userPermissions}
        />
      )}

      <LeadsContent
        loading={loading}
        leads={leads}
        localLeads={localLeads}
        searchTerm={searchTerm}
        filters={filters}
        statusOptions={statusOptions}
        sourceOptions={sourceOptions}
        statusCounts={statusCounts}
        statusCountsLoading={statusCountsLoading}
        statusCountsExpanded={statusCountsExpanded}
        selectedLeads={selectedLeads}
        userPermissions={userPermissions}
        leadCardRefs={leadCardRefs}
        scrollViewRef={scrollViewRef}
        currentPage={currentPage}
        totalPages={totalPages}
        totalLeads={totalLeads}
        leadsPerPage={leadsPerPage}
        paginationLoading={paginationLoading}
        miles600={miles600}
        onStatusCountsExpandedChange={setStatusCountsExpanded}
        onStatusFilter={handleStatusFilter}
        onClearStatusFilter={() => {
          updateFilters({ ...filters, selectedStatuses: [] });
          setCurrentPage(0);
        }}
        onLeadUpdate={handleLeadUpdate}
        onPageChange={handlePageChange}
        onModalOpen={(type, leadId, callback) => {
          if (type === "Add Reminder") {
            const modalId = "reminder-modal";
            if (ModalManager.canOpenModal(modalId)) {
              ModalManager.closeAllExcept(modalId);
              openReminderModal(leadId, callback);
              ModalManager.registerModal(modalId, closeReminderModal);
            }
          } else if (type === "Add Meeting") {
            const modalId = "meeting-modal";
            if (ModalManager.canOpenModal(modalId)) {
              ModalManager.closeAllExcept(modalId);
              openMeetingModal(leadId, callback);
              ModalManager.registerModal(modalId, closeMeetingModal);
            }
          } else {
            if (callback) callback();
          }
        }}
        isLeadSelected={isLeadSelected}
        toggleLeadSelection={toggleLeadSelection}
        scrollToCard={scrollToCard}
        setSearchTerm={setSearchTerm}
        updateFilters={updateFilters}
        setCurrentPage={setCurrentPage}
      />

      <LeadTypeModal
        visible={headerDropdownOpen}
        selectedType={filters.leadType || "marketing"}
        onClose={() => setHeaderDropdownOpen(false)}
        onTypeChange={handleLeadTypeChange}
      />

      <FiltersModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onLeadsDataChange={handleLeadsDataChange}
        statusOptions={statusOptions}
        sourceOptions={sourceOptions}
        tagOptions={tagOptions}
        agents={processAgentsForFilters(agents, user)}
        searchBoxOptions={SEARCH_BOX_OPTIONS}
        countOptions={COUNT_OPTIONS}
        leadsData={{
          leadsPerPage,
          currentPage: currentPage + 1,
        }}
        onFetchTags={fetchTagOptions}
        currentUser={user}
      />

      <ReminderModal
        visible={showReminderModal}
        onClose={() => {
          ModalManager.unregisterModal("reminder-modal");
          setTimeout(closeReminderModal, MODAL_CLOSE_DELAY_SHORT);
        }}
        leadId={reminderLeadId || ""}
        assigneesOptions={getUsersFromAgents(agents)}
        onSuccess={() => {
          if (reminderCallback) {
            setTimeout(() => {
              reminderCallback();
            }, CALLBACK_DELAY);
          }

          Toast.show("Reminder added successfully", {
            duration: Toast.durations.SHORT,
          });

          ModalManager.unregisterModal("reminder-modal");
          setTimeout(closeReminderModal, MODAL_CLOSE_DELAY_LONG);
        }}
      />

      <MeetingModal
        visible={showMeetingModal}
        onClose={() => {
          ModalManager.unregisterModal("meeting-modal");
          setTimeout(closeMeetingModal, MODAL_CLOSE_DELAY_SHORT);
        }}
        leadId={meetingLeadId || ""}
        assigneeOptions={getUsersFromAgents(agents)}
        statusOptions={statusOptions}
        onSuccess={() => {
          if (meetingCallback) {
            setTimeout(() => {
              meetingCallback();
            }, CALLBACK_DELAY);
          }

          Toast.show("Meeting scheduled successfully", {
            duration: Toast.durations.SHORT,
          });

          ModalManager.unregisterModal("meeting-modal");
          setTimeout(closeMeetingModal, MODAL_CLOSE_DELAY_LONG);
        }}
      />

      <BulkModal
        visible={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        selectedLeads={selectedLeads}
        onBulkOperationComplete={handleBulkOperationComplete}
        statusOptions={statusOptions}
        sourceOptions={sourceOptions}
        agents={getFlattenedAgents(agents)}
        tagOptions={tagOptions || []}
        currentUser={user}
      />
    </View>
  );
}
