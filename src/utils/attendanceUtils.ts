import { AttendanceStatus, EmployeeAttendance, Department, DepartmentSettings } from '@/types';
import { defaultDepartmentSettings, getDepartmentForEmployee, getExpectedWorkHours, getExpectedTimes } from './departmentUtils';
import { supabase } from '@/integrations/supabase/client';

// Function to check if a date is Sunday
export function isSunday(date: string): boolean {
  const day = new Date(date).getDay();
  return day === 0; // 0 represents Sunday
}

// Function to parse time string to minutes since midnight
export function timeToMinutes(time: string): number {
  if (!time) return 0;
  
  // Handle AM/PM format
  if (time.includes('AM') || time.includes('PM')) {
    const [timePart, period] = time.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    
    // Adjust for PM
    if (period === 'PM' && hours < 12) {
      hours += 12;
    }
    // Adjust for 12 AM
    if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return hours * 60 + (minutes || 0);
  }
  
  // Handle 24-hour format (HH:MM:SS)
  const parts = time.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  
  return hours * 60 + minutes;
}

// Function to format minutes to time string (e.g., "09:30 AM")
export function minutesToTimeAMPM(minutes: number): string {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  // Convert to 12-hour format with AM/PM
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  
  return `${hours12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
}

// Calculate total hours between entry and exit times
export function calculateTotalHours(entryTime: string, exitTime: string): number {
  const entryMinutes = timeToMinutes(entryTime);
  const exitMinutes = timeToMinutes(exitTime);
  
  // Night shift detection: if exit time is less than entry time, assume night shift
  const diffMinutes = exitMinutes < entryMinutes 
    ? (24 * 60 - entryMinutes) + exitMinutes  // Night shift calculation
    : exitMinutes - entryMinutes;             // Same day calculation
  
  return parseFloat((diffMinutes / 60).toFixed(2));
}

// Calculate attendance status based on entry/exit times and department settings
export function calculateAttendanceStatus(
  attendance: EmployeeAttendance, 
  settings: DepartmentSettings = defaultDepartmentSettings
): AttendanceStatus {
  const { entryTime, exitTime, department, name, date } = attendance;
  
  // If it's Sunday, mark as overtime regardless of hours
  if (isSunday(date)) {
    return 'overtime';
  }
  
  // If no entry time, it's a missing checkout
  if (!entryTime) return 'missingCheckout';
  
  // If no exit time, it's a missing checkout
  if (!exitTime) return 'missingCheckout';
  
  // Get expected times based on employee name and department
  const expectedTimes = getExpectedTimes(name, department);
  
  const entryMinutes = timeToMinutes(entryTime);
  const exitMinutes = timeToMinutes(exitTime);
  const expectedEntryMinutes = timeToMinutes(expectedTimes.entry);
  const expectedExitMinutes = timeToMinutes(expectedTimes.exit);
  
  // Handle night shift detection for department settings
  const isNightShiftDept = expectedExitMinutes < expectedEntryMinutes;
  const isNightShiftEmployee = exitMinutes < entryMinutes;
  
  // Using 15-minute grace period for both entry and exit as specified
  const GRACE_MINUTES = 15;
  
  // If entry is late - more than 15 minutes after expected entry time
  if ((isNightShiftDept && entryMinutes > expectedEntryMinutes + GRACE_MINUTES && entryMinutes < 24*60) || 
      (!isNightShiftDept && entryMinutes > expectedEntryMinutes + GRACE_MINUTES)) {
    return 'lateEntry';
  }
  
  // If exit is early - more than 15 minutes before expected exit time
  if ((isNightShiftDept && exitMinutes < expectedExitMinutes - GRACE_MINUTES && exitMinutes >= 0) || 
      (!isNightShiftDept && exitMinutes < expectedExitMinutes - GRACE_MINUTES)) {
    return 'earlyExit';
  }
  
  // Calculate expected work hours in minutes
  const expectedWorkMinutes = isNightShiftDept
    ? (24 * 60 - expectedEntryMinutes) + expectedExitMinutes // Night shift
    : expectedExitMinutes - expectedEntryMinutes;
  
  // Calculate actual work hours in minutes
  const actualWorkMinutes = isNightShiftEmployee
    ? (24 * 60 - entryMinutes) + exitMinutes // Night shift
    : exitMinutes - entryMinutes;            // Day shift
  
  // If worked less than expected hours minus grace period
  if (actualWorkMinutes < expectedWorkMinutes - GRACE_MINUTES * 2) { // Grace period both at entry and exit
    return 'lessHours';
  }
  
  // Otherwise, on time
  return 'onTime';
}

export function getStatusIcon(status: AttendanceStatus): string {
  switch (status) {
    case 'onTime':
      return '';
    case 'lateEntry':
      return '';
    case 'earlyExit':
      return '';
    case 'missingCheckout':
      return '';
    case 'lessHours':
      return '';
    case 'overtime':
      return '';
    default:
      return '';
  }
}

export function getStatusColor(status: AttendanceStatus): string {
  switch (status) {
    case 'onTime':
      return 'bg-status-onTime';
    case 'lateEntry':
      return 'bg-status-lateEntry';
    case 'earlyExit':
      return 'bg-status-earlyExit';
    case 'missingCheckout':
      return 'bg-status-missingCheckout';
    case 'lessHours':
      return 'bg-status-lessHours';
    case 'overtime':
      return 'bg-status-overtime';
    default:
      return 'bg-gray-300';
  }
}

// Helper: get the first day of the current month as yyyy-mm-dd
export function getFirstDayOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;
}

export function calculateEmployeeStats(
  attendanceData: EmployeeAttendance[],
  days: number | null = null,
  fromDate: string | null = null
): {
  totalPresent: number;
  totalWorkingHours: number;
  averageDailyHours: number;
  lateEntries: number;
  earlyExits: number;
  shortfallHours: number;
  overtimeHours: number;
  sundayOvertimeHours: number;
  regularOvertimeHours: number;
  sundaysWorked: number;
  longestOvertimeDay: { date: string; hours: number } | null;
  perfectAttendanceDays: number;
  mostFrequentStatus: string;
  firstAttendanceDate: string | null;
  lastAttendanceDate: string | null;
} {
  // Filter by date range if specified
  let filteredData = [...attendanceData];
  if (fromDate) {
    filteredData = attendanceData.filter(record => record.date >= fromDate);
  } else if (days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const dateString = cutoffDate.toISOString().split('T')[0];
    filteredData = attendanceData.filter(record => record.date >= dateString);
  }

  // Sort by date for first/last attendance
  const sortedByDate = [...filteredData].sort((a, b) => a.date.localeCompare(b.date));
  const firstAttendanceDate = sortedByDate.length > 0 ? sortedByDate[0].date : null;
  const lastAttendanceDate = sortedByDate.length > 0 ? sortedByDate[sortedByDate.length - 1].date : null;

  // Separate Sundays
  const sundays = filteredData.filter(record => isSunday(record.date));
  // Present days: all non-Sundays (including missingCheckout)
  const presentDays = filteredData.filter(record => !isSunday(record.date));

  // totalPresent: all non-Sundays (including missingCheckout)
  const totalPresent = presentDays.length;

  // totalWorkingHours: sum of totalHours for non-Sundays, but 0 for missingCheckout
  const totalWorkingHours = presentDays.reduce(
    (sum, record) => sum + (record.status === 'missingCheckout' ? 0 : record.totalHours), 0
  );

  // averageDailyHours: only for present days
  const averageDailyHours = totalPresent > 0 
    ? parseFloat((totalWorkingHours / totalPresent).toFixed(2)) 
    : 0;

  // lateEntries and earlyExits: only for present days
  const lateEntries = presentDays.filter(
    record => record.status === 'lateEntry'
  ).length;

  const earlyExits = presentDays.filter(
    record => record.status === 'earlyExit'
  ).length;

  // expectedHours: sum for all present days (including missingCheckout)
  const expectedHours = presentDays.reduce((sum, record) => {
    const standardHours = getExpectedWorkHours(record.name, record.department);
    return sum + standardHours;
  }, 0);

  // Sunday hours (all are overtime)
  const sundayOvertimeHours = sundays.reduce((sum, record) => sum + record.totalHours, 0);
  const sundaysWorked = sundays.length;

  // Calculate raw shortfall and overtime (excluding Sundays)
  let rawShortfall = expectedHours - totalWorkingHours;
  let rawOvertime = totalWorkingHours - expectedHours;
  if (rawShortfall < 0) rawShortfall = 0;
  if (rawOvertime < 0) rawOvertime = 0;

  // Add Sunday hours to overtime
  let overtimeHours = rawOvertime + sundayOvertimeHours;
  let shortfallHours = rawShortfall;

  // Adjust: use overtime to cover shortfall
  if (shortfallHours > 0 && overtimeHours > 0) {
    if (overtimeHours >= shortfallHours) {
      overtimeHours = overtimeHours - shortfallHours;
      shortfallHours = 0;
    } else {
      shortfallHours = shortfallHours - overtimeHours;
      overtimeHours = 0;
    }
  }

  // Calculate regular overtime (excluding Sundays, after adjustment)
  let regularOvertimeHours = overtimeHours;
  if (overtimeHours > 0 && sundayOvertimeHours > 0) {
    // If overtime remains after adjustment, subtract Sunday hours to get regular overtime
    regularOvertimeHours = overtimeHours - sundayOvertimeHours;
    if (regularOvertimeHours < 0) regularOvertimeHours = 0;
  } else if (overtimeHours > 0 && sundayOvertimeHours === 0) {
    regularOvertimeHours = overtimeHours;
  } else {
    regularOvertimeHours = 0;
  }

  // Longest overtime day (max hours above expected, including Sundays)
  let longestOvertimeDay: { date: string; hours: number } | null = null;
  let maxOvertime = 0;
  for (const record of filteredData) {
    const expected = getExpectedWorkHours(record.name, record.department);
    const overtime = record.totalHours - expected;
    if (overtime > maxOvertime) {
      maxOvertime = overtime;
      longestOvertimeDay = { date: record.date, hours: parseFloat(overtime.toFixed(2)) };
    }
  }

  // Perfect attendance days (onTime status)
  const perfectAttendanceDays = filteredData.filter(r => r.status === 'onTime').length;

  // Most frequent status
  const statusCounts: Record<string, number> = {};
  for (const record of filteredData) {
    statusCounts[record.status] = (statusCounts[record.status] || 0) + 1;
  }
  let mostFrequentStatus = '';
  let maxStatusCount = 0;
  for (const [status, count] of Object.entries(statusCounts)) {
    if (count > maxStatusCount) {
      maxStatusCount = count;
      mostFrequentStatus = status;
    }
  }

  // Round to 1 decimal place
  overtimeHours = parseFloat(overtimeHours.toFixed(1));
  shortfallHours = parseFloat(shortfallHours.toFixed(1));
  regularOvertimeHours = parseFloat(regularOvertimeHours.toFixed(1));

  return {
    totalPresent,
    totalWorkingHours,
    averageDailyHours,
    lateEntries,
    earlyExits,
    shortfallHours,
    overtimeHours,
    sundayOvertimeHours: parseFloat(sundayOvertimeHours.toFixed(1)),
    regularOvertimeHours,
    sundaysWorked,
    longestOvertimeDay,
    perfectAttendanceDays,
    mostFrequentStatus,
    firstAttendanceDate,
    lastAttendanceDate
  };
}

// Load attendance data by date from the database
export async function loadAttendanceByDate(date: string) {
  try {
    const { data, error } = await supabase
      .from('daily_attendance')
      .select('*')
      .eq('date', date);
      
    if (error) {
      console.error('Error loading attendance data:', error);
      throw error;
    }
    
    console.log('Database response for date', date, ':', data);
    
    // Transform database format to our app format
    if (data && data.length > 0) {
      return data.map((record): EmployeeAttendance => {
        // Convert time format if needed
        const entryTime = record.in_time ? formatTimeIfNeeded(record.in_time) : null;
        const exitTime = record.out_time ? formatTimeIfNeeded(record.out_time) : null;
        
        // Calculate total hours from minutes or from times
        let totalHours = record.total_minutes ? record.total_minutes / 60 : 0;
        if (!totalHours && entryTime && exitTime) {
          totalHours = calculateTotalHours(entryTime, exitTime);
        }
        
        // Get department for employee
        const department = getDepartmentForEmployee(record.name);
        
        return {
          id: record.id,
          acNo: record.ac_no,
          name: record.name,
          date: record.date,
          entryTime,
          exitTime,
          department,
          status: record.status && record.status.length > 0 
            ? record.status[0] as AttendanceStatus 
            : calculateStatusFromTimes(entryTime, exitTime, department),
          totalHours
        };
      });
    }
    
    return [];
  } catch (error) {
    console.error('Failed to load attendance data:', error);
    throw error;
  }
}

// Helper function to calculate status if not provided in the database
function calculateStatusFromTimes(entryTime: string | null, exitTime: string | null, department: Department): AttendanceStatus {
  if (!entryTime || !exitTime) return 'missingCheckout';
  
  const attendance: EmployeeAttendance = {
    id: '',
    acNo: '',
    name: '',
    date: '',
    entryTime,
    exitTime,
    department,
    status: 'onTime', // placeholder
    totalHours: 0
  };
  
  return calculateAttendanceStatus(attendance);
}

// Format time string to consistent format if needed
function formatTimeIfNeeded(timeStr: string): string {
  // Check if already in AM/PM format
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    return timeStr;
  }
  
  // Convert from 24-hour to AM/PM format
  const minutes = timeToMinutes(timeStr);
  return minutesToTimeAMPM(minutes);
}

// Load employee attendance history
export async function loadEmployeeHistory(employeeName: string, days: number | null = null) {
  try {
    let query = supabase
      .from('daily_attendance')
      .select('*')
      .eq('name', employeeName)
      .order('date', { ascending: false });
    
    // If days is specified, filter by date range
    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const dateString = cutoffDate.toISOString().split('T')[0];
      
      query = query.gte('date', dateString);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error loading employee history:', error);
      throw error;
    }
    
    // Transform database format to our app format
    if (data && data.length > 0) {
      return data.map((record): EmployeeAttendance => {
        // Convert time format if needed
        const entryTime = record.in_time ? formatTimeIfNeeded(record.in_time) : null;
        const exitTime = record.out_time ? formatTimeIfNeeded(record.out_time) : null;
        
        // Calculate total hours from minutes or from times
        let totalHours = record.total_minutes ? record.total_minutes / 60 : 0;
        if (!totalHours && entryTime && exitTime) {
          totalHours = calculateTotalHours(entryTime, exitTime);
        }
        
        // Get department for employee
        const department = getDepartmentForEmployee(record.name);
        
        return {
          id: record.id,
          acNo: record.ac_no,
          name: record.name,
          date: record.date,
          entryTime,
          exitTime,
          department,
          status: record.status && record.status.length > 0 
            ? record.status[0] as AttendanceStatus 
            : calculateStatusFromTimes(entryTime, exitTime, department),
          totalHours
        };
      });
    }
    
    return [];
  } catch (error) {
    console.error('Failed to load employee history:', error);
    throw error;
  }
}
