
import { AttendanceStatus, EmployeeAttendance, Department, DepartmentSettings } from '@/types';
import { defaultDepartmentSettings } from './departmentUtils';

// Function to parse time string (e.g., "09:30") to minutes since midnight
export function timeToMinutes(time: string): number {
  if (!time) return 0;
  
  // Check if the time is in HH:MM:SS format and convert to HH:MM
  if (time.split(':').length > 2) {
    time = time.split(':').slice(0, 2).join(':');
  }
  
  // Handle potential AM/PM format
  let hours = 0;
  let minutes = 0;
  
  if (time.includes('AM') || time.includes('PM')) {
    const [timeStr, period] = time.split(' ');
    const [h, m] = timeStr.split(':').map(Number);
    
    hours = h;
    minutes = m || 0;
    
    // Adjust for PM
    if (period === 'PM' && hours < 12) {
      hours += 12;
    }
    // Adjust for 12 AM
    if (period === 'AM' && hours === 12) {
      hours = 0;
    }
  } else {
    const [h, m] = time.split(':').map(Number);
    hours = h || 0;
    minutes = m || 0;
  }
  
  return hours * 60 + minutes;
}

// Function to format minutes to time string (e.g., "09:30")
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Calculate total hours between entry and exit times
export function calculateTotalHours(entryTime: string, exitTime: string): number {
  const entryMinutes = timeToMinutes(entryTime);
  const exitMinutes = timeToMinutes(exitTime);
  
  // Night shift detection: if exit time is less than entry time, assume night shift
  // For example, entry at 18:00 (1080 minutes) and exit at 08:00 (480 minutes)
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
  const { entryTime, exitTime, department } = attendance;
  const deptSettings = settings[department];
  
  if (!deptSettings) {
    console.error(`No settings found for department: ${department}`);
    return 'missingCheckout';
  }
  
  // If no entry time, it's a missing checkout
  if (!entryTime) return 'missingCheckout';
  
  // If no exit time, it's a missing checkout
  if (!exitTime) return 'missingCheckout';
  
  const entryMinutes = timeToMinutes(entryTime);
  const exitMinutes = timeToMinutes(exitTime);
  const expectedEntryMinutes = timeToMinutes(deptSettings.entry);
  const expectedExitMinutes = timeToMinutes(deptSettings.exit);
  
  // Handle night shift detection for department settings
  const isNightShiftDept = expectedExitMinutes < expectedEntryMinutes;
  const isNightShiftEmployee = exitMinutes < entryMinutes;
  
  // If entry is late
  // Night shift: If entry time is after expected entry time and before midnight
  // Day shift: If entry time is after expected entry time
  if ((isNightShiftDept && entryMinutes > expectedEntryMinutes && entryMinutes < 24*60) || 
      (!isNightShiftDept && entryMinutes > expectedEntryMinutes + 15)) { // 15-minute grace period
    return 'lateEntry';
  }
  
  // If exit is early
  // Night shift: If exit time is before expected exit time and after midnight
  // Day shift: If exit time is before expected exit time
  if ((isNightShiftDept && exitMinutes < expectedExitMinutes && exitMinutes >= 0) || 
      (!isNightShiftDept && exitMinutes < expectedExitMinutes - 15)) { // 15-minute grace period
    return 'earlyExit';
  }
  
  // Calculate expected work hours in minutes
  const expectedWorkMinutes = isNightShiftDept
    ? (24 * 60 - expectedEntryMinutes) + expectedExitMinutes // Night shift
    : expectedExitMinutes - expectedEntryMinutes;            // Day shift
  
  // Calculate actual work hours in minutes
  const actualWorkMinutes = isNightShiftEmployee
    ? (24 * 60 - entryMinutes) + exitMinutes // Night shift
    : exitMinutes - entryMinutes;            // Day shift
  
  // If worked less than expected hours minus 30 minutes
  if (actualWorkMinutes < expectedWorkMinutes - 30) {
    return 'lessHours';
  }
  
  // Otherwise, on time
  return 'onTime';
}

export function getStatusIcon(status: AttendanceStatus): string {
  switch (status) {
    case 'onTime':
      return '✅';
    case 'lateEntry':
      return '🕒';
    case 'earlyExit':
      return '🚪';
    case 'missingCheckout':
      return '❌';
    case 'lessHours':
      return '⏳';
    default:
      return '❓';
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
    default:
      return 'bg-gray-300';
  }
}

export function calculateEmployeeStats(
  attendanceData: EmployeeAttendance[],
  days: number | null = null
): {
  totalPresent: number;
  totalWorkingHours: number;
  averageDailyHours: number;
  lateEntries: number;
  earlyExits: number;
} {
  // Filter by date range if specified
  let filteredData = [...attendanceData];
  
  if (days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    filteredData = attendanceData.filter(record => 
      new Date(record.date) >= cutoffDate
    );
  }
  
  const totalPresent = filteredData.length;
  
  const totalWorkingHours = filteredData.reduce(
    (sum, record) => sum + record.totalHours, 0
  );
  
  const averageDailyHours = totalPresent > 0 
    ? parseFloat((totalWorkingHours / totalPresent).toFixed(2)) 
    : 0;
  
  const lateEntries = filteredData.filter(
    record => record.status === 'lateEntry'
  ).length;
  
  const earlyExits = filteredData.filter(
    record => record.status === 'earlyExit'
  ).length;
  
  return {
    totalPresent,
    totalWorkingHours,
    averageDailyHours,
    lateEntries,
    earlyExits
  };
}

// Load attendance data by date from the database
export async function loadAttendanceByDate(date: string) {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase
      .from('daily_attendance')
      .select('*')
      .eq('date', date);
      
    if (error) {
      console.error('Error loading attendance data:', error);
      throw error;
    }
    
    // Transform database format to our app format
    if (data && data.length > 0) {
      return data.map((record): EmployeeAttendance => {
        // Calculate total hours from minutes
        const totalHours = record.total_minutes ? record.total_minutes / 60 : 0;
        
        return {
          id: record.id,
          acNo: record.ac_no,
          name: record.name,
          date: record.date,
          entryTime: record.in_time,
          exitTime: record.out_time,
          department: getDepartmentForEmployee(record.name),
          status: record.status && record.status.length > 0 
            ? record.status[0] as AttendanceStatus 
            : 'missingCheckout',
          totalHours: totalHours
        };
      });
    }
    
    return [];
  } catch (error) {
    console.error('Failed to load attendance data:', error);
    throw error;
  }
}

// Load employee attendance history
export async function loadEmployeeHistory(employeeName: string, days: number | null = null) {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
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
        // Calculate total hours from minutes
        const totalHours = record.total_minutes ? record.total_minutes / 60 : 0;
        
        return {
          id: record.id,
          acNo: record.ac_no,
          name: record.name,
          date: record.date,
          entryTime: record.in_time,
          exitTime: record.out_time,
          department: getDepartmentForEmployee(record.name),
          status: record.status && record.status.length > 0 
            ? record.status[0] as AttendanceStatus 
            : 'missingCheckout',
          totalHours: totalHours
        };
      });
    }
    
    return [];
  } catch (error) {
    console.error('Failed to load employee history:', error);
    throw error;
  }
}

// Helper function to get department for an employee
function getDepartmentForEmployee(name: string): Department {
  // Import and use the function from departmentUtils
  const { getDepartmentForEmployee } = require('./departmentUtils');
  return getDepartmentForEmployee(name);
}
