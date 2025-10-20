import { FilterOption } from "@/services/api";

/**
 * Static filter options that don't require API calls
 */
export const SEARCH_BOX_OPTIONS: FilterOption[] = [
  { value: "LeadInfo", label: "Lead info" },
  { value: "Comments", label: "Comments" },
  { value: "Reminders", label: "Reminders" },
  { value: "Meetings", label: "Meetings" },
];

export const COUNT_OPTIONS: FilterOption[] = [
  { value: "10", label: "10 per page" },
  { value: "25", label: "25 per page" },
  { value: "50", label: "50 per page" },
  { value: "100", label: "100 per page" },
];

export const DATE_FOR_OPTIONS = [
  { value: "LeadIntroduction", label: "Lead introduction" },
  { value: "LastCalled", label: "Last call" },
];

/**
 * Default pagination settings
 */
export const DEFAULT_PAGINATION = {
  PAGE: 0,
  PAGE_SIZE: 10,
  DEBOUNCE_DELAY: 500,
};

/**
 * Default filter values
 */
export const DEFAULT_FILTERS = {
  searchTerm: "",
  searchBoxFilters: ["LeadInfo"],
  selectedAgents: [],
  selectedStatuses: [],
  selectedSources: [],
  selectedTags: [],
  dateRange: [null, null] as [Date | null, Date | null],
  dateFor: "LeadIntroduction",
};
