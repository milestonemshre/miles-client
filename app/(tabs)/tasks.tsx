import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTasksData } from "../../hooks/useTasksData";
import { useTasksFilters } from "../../hooks/useTasksFilters";
import { useCurrentTime } from "../../hooks/useCurrentTime";
import { PeriodToggle } from "../../components/tasks/PeriodToggle";
import { SummaryCards } from "../../components/tasks/SummaryCards";
import { TasksList } from "../../components/tasks/TasksList";
import { calculateSummary } from "../../utils/taskUtils";

export default function TasksScreen() {
  const { 
    tasks, 
    loading, 
    refreshing, 
    loadTasks, 
    refreshTasks, 
    completeTask, 
    undoCompleteTask 
  } = useTasksData();
  
  const { period, activeFilter, handlePeriodChange, handleFilterChange } = useTasksFilters();
  const currentTime = useCurrentTime();

  useEffect(() => {
    loadTasks(period);
  }, [period, loadTasks]);

  // Calculate summary based on all tasks for display
  const visibleSummary = calculateSummary(tasks);

  const handleCompleteTask = (task: any) => {
    completeTask(task, period);
  };

  const handleUndoCompleteTask = (task: any) => {
    undoCompleteTask(task, period);
  };

  const handleRefresh = () => {
    refreshTasks(period);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-6 py-4">
        <Text className="text-2xl font-bold text-gray-900 mb-4">Tasks</Text>
        
        <PeriodToggle period={period} onPeriodChange={handlePeriodChange} />
        
        <SummaryCards 
          summary={visibleSummary} 
          activeFilter={activeFilter} 
          onFilterChange={handleFilterChange} 
        />
      </View>

      {/* Tasks List */}
      <TasksList
        tasks={tasks}
        loading={loading}
        refreshing={refreshing}
        activeFilter={activeFilter}
        period={period}
        currentTime={currentTime}
        onRefresh={handleRefresh}
        onCompleteTask={handleCompleteTask}
        onUndoCompleteTask={handleUndoCompleteTask}
      />
    </SafeAreaView>
  );
}
