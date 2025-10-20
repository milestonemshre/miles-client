import { useState } from "react";
import { PeriodType, FilterType } from "../types/tasks";

export const useTasksFilters = () => {
  const [period, setPeriod] = useState<PeriodType>("today");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
  };

  return {
    period,
    activeFilter,
    handlePeriodChange,
    handleFilterChange,
  };
};