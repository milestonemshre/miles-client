import { Task } from "../types/tasks";

export const formatDateWithCountdown = (dateString: string, currentTime: Date) => {
  const taskDate = new Date(dateString);
  const now = currentTime;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDateOnly = new Date(
    taskDate.getFullYear(),
    taskDate.getMonth(),
    taskDate.getDate()
  );

  // Check if task is today
  if (taskDateOnly.getTime() === today.getTime()) {
    const timeDifference = taskDate.getTime() - now.getTime();

    if (timeDifference > 0) {
      // Task is in the future - show countdown
      const hoursLeft = Math.floor(timeDifference / (1000 * 60 * 60));
      const minutesLeft = Math.floor(
        (timeDifference % (1000 * 60 * 60)) / (1000 * 60)
      );

      if (hoursLeft > 0) {
        return `${hoursLeft}h ${minutesLeft}m left`;
      } else if (minutesLeft > 0) {
        return `${minutesLeft}m left`;
      } else {
        return "Starting soon";
      }
    } else {
      // Task is in the past
      const timeAgo = Math.abs(timeDifference);
      const hoursAgo = Math.floor(timeAgo / (1000 * 60 * 60));
      const minutesAgo = Math.floor(
        (timeAgo % (1000 * 60 * 60)) / (1000 * 60)
      );

      if (hoursAgo > 0) {
        return `${hoursAgo}h ${minutesAgo}m ago`;
      } else if (minutesAgo > 0) {
        return `${minutesAgo}m ago`;
      } else {
        return "Just now";
      }
    }
  } else {
    // Task is not today - show date and time
    return taskDate.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
};

export const getTaskTypeColor = (taskType: "meeting" | "reminder") => {
  return taskType === "meeting" ? "#E91E85" : "#48BB78";
};

export const getCountdownStyle = (
  dateString: string,
  currentTime: Date
) => {
  const taskDate = new Date(dateString);
  const now = currentTime;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDateOnly = new Date(
    taskDate.getFullYear(),
    taskDate.getMonth(),
    taskDate.getDate()
  );

  // If task is today, make countdown more prominent
  if (taskDateOnly.getTime() === today.getTime()) {
    const timeDifference = taskDate.getTime() - now.getTime();

    if (timeDifference > 0) {
      // Upcoming task ("left") - use neutral color
      return {
        color: "#6B7280", // Neutral gray
        fontWeight: "400" as const,
      };
    } else {
      // Elapsed task ("ago") - use red hue
      return {
        color: "#E53E3E", // Soft red
        fontWeight: "500" as const,
      };
    }
  } else if (taskDateOnly.getTime() < today.getTime()) {
    // Past dates (not today) - also show in neutral color
    return {
      color: "#9CA3AF", // Light neutral gray
      fontWeight: "400" as const,
    };
  } else {
    // Future dates - regular gray styling
    return {
      color: "#6B7280",
      fontWeight: "400" as const,
    };
  }
};

export const getTaskDateIcon = (dateString: string, currentTime: Date) => {
  const taskDate = new Date(dateString);
  const now = currentTime;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDateOnly = new Date(
    taskDate.getFullYear(),
    taskDate.getMonth(),
    taskDate.getDate()
  );
  
  const isToday = taskDateOnly.getTime() === today.getTime();
  return isToday ? "timer" : "calendar";
};

export const getTaskDateIconColor = (
  dateString: string,
  currentTime: Date,
  isCompleted: boolean
) => {
  if (isCompleted) return "#9CA3AF";
  
  const taskDate = new Date(dateString);
  const now = currentTime;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDateOnly = new Date(
    taskDate.getFullYear(),
    taskDate.getMonth(),
    taskDate.getDate()
  );
  
  const isToday = taskDateOnly.getTime() === today.getTime();
  const timeDifference = taskDate.getTime() - now.getTime();
  
  return isToday 
    ? timeDifference > 0 
      ? "#176298" 
      : "#DC2626"
    : "#176298";
};

export const getTaskDateIconBackground = (
  dateString: string,
  currentTime: Date,
  isCompleted: boolean
) => {
  if (isCompleted) return "bg-gray-200";
  
  const taskDate = new Date(dateString);
  const now = currentTime;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDateOnly = new Date(
    taskDate.getFullYear(),
    taskDate.getMonth(),
    taskDate.getDate()
  );
  
  const isToday = taskDateOnly.getTime() === today.getTime();
  const timeDifference = taskDate.getTime() - now.getTime();
  
  return isToday
    ? timeDifference > 0
      ? "bg-miles-100"
      : "bg-red-100"
    : "bg-miles-100";
};

export const filterTasks = (tasks: Task[], filterType: "all" | "meetings" | "reminders") => {
  if (filterType === "all") return tasks;
  if (filterType === "meetings") return tasks.filter(task => task.type === "meeting");
  if (filterType === "reminders") return tasks.filter(task => task.type === "reminder");
  return tasks;
};

export const calculateSummary = (tasks: Task[]) => {
  return {
    total: tasks.length,
    meetings: tasks.filter(task => task.type === "meeting").length,
    reminders: tasks.filter(task => task.type === "reminder").length,
  };
};