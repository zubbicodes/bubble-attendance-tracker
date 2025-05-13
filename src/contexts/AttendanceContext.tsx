
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AttendanceStatus, DepartmentSettings, EmployeeAttendance } from '@/types';
import { defaultDepartmentSettings } from '@/utils/departmentUtils';

interface AttendanceContextType {
  attendanceRecords: EmployeeAttendance[];
  setAttendanceRecords: React.Dispatch<React.SetStateAction<EmployeeAttendance[]>>;
  departmentSettings: DepartmentSettings;
  setDepartmentSettings: React.Dispatch<React.SetStateAction<DepartmentSettings>>;
  selectedStatus: AttendanceStatus | null;
  setSelectedStatus: React.Dispatch<React.SetStateAction<AttendanceStatus | null>>;
  selectedEmployee: EmployeeAttendance | null;
  setSelectedEmployee: React.Dispatch<React.SetStateAction<EmployeeAttendance | null>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  date: string;
  setDate: React.Dispatch<React.SetStateAction<string>>;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const [attendanceRecords, setAttendanceRecords] = useState<EmployeeAttendance[]>([]);
  const [departmentSettings, setDepartmentSettings] = useState<DepartmentSettings>(defaultDepartmentSettings);
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeAttendance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <AttendanceContext.Provider
      value={{
        attendanceRecords,
        setAttendanceRecords,
        departmentSettings,
        setDepartmentSettings,
        selectedStatus,
        setSelectedStatus,
        selectedEmployee,
        setSelectedEmployee,
        isLoading,
        setIsLoading,
        date,
        setDate,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (context === undefined) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
}
