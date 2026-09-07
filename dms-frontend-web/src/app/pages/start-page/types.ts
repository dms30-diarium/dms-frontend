export interface FilterResult {
  filterName?: string;
  checked: string[];
}

export interface WeekRange {
  start: Date;
  end: Date;
  days: Date[];
}

export interface WeeklyTaskItem {
  id: string;
  title: string;
  description?: string;
  deadline: Date;
  link?: string[];
}

export interface WeekDayTasks {
  key: string;
  label: string;
  date: Date;
  isToday: boolean;
  tasks: WeeklyTaskItem[];
}

export interface WeeklyTaskColumn extends WeekDayTasks {
  imageSrc: string;
}
