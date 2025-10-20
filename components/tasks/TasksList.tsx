import React from "react";
import { ScrollView, RefreshControl, View, Text, Alert } from "react-native";
import { Task, FilterType, PeriodType } from "../../types/tasks";
import { TaskCard } from "./TaskCard";
import { EmptyState } from "./EmptyState";
import { filterTasks } from "../../utils/taskUtils";

interface TasksListProps {
  tasks: Task[];
  loading: boolean;
  refreshing: boolean;
  activeFilter: FilterType;
  period: PeriodType;
  currentTime: Date;
  onRefresh: () => void;
  onCompleteTask: (task: Task) => void;
  onUndoCompleteTask: (task: Task) => void;
}

export const TasksList: React.FC<TasksListProps> = ({
  tasks,
  loading,
  refreshing,
  activeFilter,
  period,
  currentTime,
  onRefresh,
  onCompleteTask,
  onUndoCompleteTask,
}) => {
  const filteredTasks = filterTasks(tasks, activeFilter);

  const handleCompleteTask = (task: Task) => {
    Alert.alert(
      "Complete Task",
      `Are you sure you want to mark this ${task.type} as completed?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Complete",
          style: "default",
          onPress: () => onCompleteTask(task),
        },
      ]
    );
  };

  const handleUndoComplete = (task: Task) => {
    Alert.alert(
      "Undo Completion",
      `Are you sure you want to mark this ${task.type} as pending again?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Undo",
          style: "default",
          onPress: () => onUndoCompleteTask(task),
        },
      ]
    );
  };

  return (
    <ScrollView
      className="flex-1 px-6 py-4"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {loading ? (
        <View className="flex-1 justify-center items-center py-12">
          <Text className="text-gray-500">Loading tasks...</Text>
        </View>
      ) : filteredTasks.length > 0 ? (
        filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            currentTime={currentTime}
            onComplete={() => handleCompleteTask(task)}
            onUndoComplete={() => handleUndoComplete(task)}
          />
        ))
      ) : (
        <EmptyState activeFilter={activeFilter} period={period} />
      )}
    </ScrollView>
  );
};