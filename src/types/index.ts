
export type Department = 'administration' | 'supervisor' | 'packing' | 'production' | 'others';

export type DepartmentSettings = {
  [key in Department]: {
    entry: string;
    exit: string;
  };
};

export type AttendanceStatus = 'onTime' | 'lateEntry' | 'earlyExit' | 'missingCheckout' | 'lessHours';

export interface EmployeeAttendance {
  id: string;
  acNo: string;
  name: string;
  date: string;
  entryTime: string | null;
  exitTime: string | null;
  department: Department;
  status: AttendanceStatus;
  totalHours: number;
  exception?: string;
  operation?: string;
}

export type DepartmentMap = {
  [key in Department]: string[];
};

export type EmployeeStats = {
  totalPresent: number;
  totalWorkingHours: number;
  averageDailyHours: number;
  lateEntries: number;
  earlyExits: number;
  shortfallHours: number;  // Added shortfall hours
  overtimeHours: number;   // Added overtime hours
};

export type Period = '7days' | '30days' | 'allTime';

export type StatsMap = {
  [key in Period]: EmployeeStats;
};
