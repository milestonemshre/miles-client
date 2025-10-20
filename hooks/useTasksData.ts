import { useState, useCallback, useContext } from "react";
import { Alert } from "react-native";
import { UserContext } from "../app/_layout";
import { createAuthHeaders } from "../services/api";
import { Task, TasksResponse, TaskSummary, PeriodType, UpdateTaskStatusParams } from "../types/tasks";

const getBaseUrl = () => {
  if (__DEV__) {
    return process.env.EXPO_PUBLIC_BASE_URL || "http://192.168.70.3:3000";
  } else {
    return "";
  }
};

export const useTasksData = () => {
  const user = useContext(UserContext) as any;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<TaskSummary>({
    total: 0,
    meetings: 0,
    reminders: 0,
  });

  const fetchTasks = useCallback(async (selectedPeriod: PeriodType) => {
    if (!user?.id) {
      return;
    }

    try {
      const baseUrl = getBaseUrl();
      const headers = await createAuthHeaders();
      const url = `${baseUrl}/api/tasks?period=${selectedPeriod}&userId=${user.id}`;

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            "Tasks feature is being deployed. Please try again in a few minutes."
          );
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: TasksResponse = await response.json();

      if (data.success) {
        setTasks(data.tasks || []);
        setSummary(data.summary || { total: 0, meetings: 0, reminders: 0 });
      } else {
        throw new Error("Failed to fetch tasks");
      }
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      Alert.alert("Error", `Failed to load tasks: ${error.message}`);
    }
  }, [user?.id]);

  const updateTaskStatus = useCallback(async (params: UpdateTaskStatusParams) => {
    try {
      const baseUrl = getBaseUrl();
      const headers = await createAuthHeaders();
      const url = `${baseUrl}/api/tasks`;

      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error: any) {
      console.error("Error updating task status:", error);
      throw error;
    }
  }, []);

  const loadTasks = useCallback(async (period: PeriodType) => {
    setLoading(true);
    await fetchTasks(period);
    setLoading(false);
  }, [fetchTasks]);

  const refreshTasks = useCallback(async (period: PeriodType) => {
    setRefreshing(true);
    await fetchTasks(period);
    setRefreshing(false);
  }, [fetchTasks]);

  const completeTask = useCallback(async (task: Task, period: PeriodType) => {
    try {
      await updateTaskStatus({
        taskId: task.id,
        taskType: task.type,
        status: "Completed",
        userId: user.id,
      });
      await fetchTasks(period);
    } catch (error: any) {
      Alert.alert("Error", `Failed to complete task: ${error.message}`);
    }
  }, [updateTaskStatus, fetchTasks, user?.id]);

  const undoCompleteTask = useCallback(async (task: Task, period: PeriodType) => {
    try {
      await updateTaskStatus({
        taskId: task.id,
        taskType: task.type,
        status: "Pending",
        userId: user.id,
      });
      await fetchTasks(period);
    } catch (error: any) {
      Alert.alert("Error", `Failed to undo completion: ${error.message}`);
    }
  }, [updateTaskStatus, fetchTasks, user?.id]);

  return {
    tasks,
    loading,
    refreshing,
    summary,
    loadTasks,
    refreshTasks,
    completeTask,
    undoCompleteTask,
  };
};