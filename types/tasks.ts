export interface Task {
  id: string;
  type: "meeting" | "reminder";
  title?: string;
  description: string;
  date: string;
  leadName: string;
  leadPhone: string;
  leadEmail: string;
  status: string;
  location?: string;
  priority?: string;
  completed: boolean;
  completedAt: string | null;
  completionStatus: "Pending" | "Completed" | "Cancelled";
}

export interface TasksResponse {
  success: boolean;
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  tasks: Task[];
  summary: {
    total: number;
    meetings: number;
    reminders: number;
  };
}

export interface TaskSummary {
  total: number;
  meetings: number;
  reminders: number;
}

export type PeriodType = "today" | "week";
export type FilterType = "all" | "meetings" | "reminders";
export type TaskStatus = "Pending" | "Completed" | "Cancelled";

export interface UpdateTaskStatusParams {
  taskId: string;
  taskType: string;
  status: TaskStatus;
  userId: string;
}