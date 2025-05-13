import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { AttendanceStatus, EmployeeAttendance, Department } from '@/types';
import { getDepartmentForEmployee } from './departmentUtils';
import { calculateAttendanceStatus, calculateTotalHours } from './attendanceUtils';

export const parseExcelFile = async (file: File): Promise<EmployeeAttendance[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Assuming the first sheet contains the data
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Extract date from filename (assuming format like 12052025.xls)
        const fileName = file.name;
        const dateMatch = fileName.match(/(\d{2})(\d{2})(\d{4})/);
        let dateString = '';
        
        if (dateMatch && dateMatch.length === 4) {
          const [_, day, month, year] = dateMatch;
          dateString = `${year}-${month}-${day}`;
        } else {
          // Default to current date if filename format doesn't match
          const today = new Date();
          dateString = today.toISOString().split('T')[0];
        }
        
        // Process each row
        const attendanceRecords: EmployeeAttendance[] = jsonData.map((row: any) => {
          const acNo = row['AC.No.'] || row['AC No'] || row['AC.No'] || '';
          const name = row['Name'] || '';
          const timeStr = row['Time'] || '';
          const operation = row['Operation'] || '';
          const exception = row['Exception'] || '';
          
          // Parse time and determine whether it's entry or exit
          let entryTime = null;
          let exitTime = null;
          
          if (operation === 'FOT' && timeStr) {
            const parts = timeStr.split(' ');
            if (parts.length === 2) {
              // Assuming time format like "5/12/2025 7:54"
              const timePart = parts[1];
              
              // If it contains "OverTime In", it's an entry
              if (exception === 'OverTime In') {
                entryTime = timePart;
              }
              // If it contains "OverTime Out", it's an exit
              else if (exception === 'OverTime Out') {
                exitTime = timePart;
              }
            }
          } else if (timeStr) {
            // For non-FOT entries, we need to determine based on time patterns
            const parts = timeStr.split(' ');
            if (parts.length === 2) {
              const timePart = parts[1];
              const hour = parseInt(timePart.split(':')[0]);
              
              // Morning times are typically entry
              if (hour < 12) {
                entryTime = timePart;
              } else {
                // Afternoon/evening times are typically exit
                exitTime = timePart;
              }
            }
          }
          
          const department = getDepartmentForEmployee(name);
          
          return {
            id: uuidv4(),
            acNo,
            name,
            date: dateString,
            entryTime,
            exitTime,
            department,
            status: 'onTime' as AttendanceStatus, // Default, will be calculated later
            totalHours: 0, // Will be calculated later
            exception,
            operation
          };
        });
        
        // Combine multiple entries for the same employee on the same day
        const employeeMap = new Map<string, EmployeeAttendance>();
        
        attendanceRecords.forEach(record => {
          const key = `${record.acNo}-${record.name}`;
          
          if (employeeMap.has(key)) {
            const existingRecord = employeeMap.get(key)!;
            
            // If the current record has an entry time and the existing doesn't
            if (record.entryTime && !existingRecord.entryTime) {
              existingRecord.entryTime = record.entryTime;
            }
            
            // If the current record has an exit time and the existing doesn't
            if (record.exitTime && !existingRecord.exitTime) {
              existingRecord.exitTime = record.exitTime;
            }
            
            // Keep the exception and operation if they exist
            if (record.exception) {
              existingRecord.exception = record.exception;
            }
            
            if (record.operation) {
              existingRecord.operation = record.operation;
            }
            
          } else {
            employeeMap.set(key, record);
          }
        });
        
        // Convert map back to array and calculate status and hours
        const processedRecords = Array.from(employeeMap.values()).map(record => {
          // Calculate total hours if both entry and exit times exist
          if (record.entryTime && record.exitTime) {
            record.totalHours = calculateTotalHours(record.entryTime, record.exitTime);
          }
          
          // Calculate attendance status
          record.status = calculateAttendanceStatus(record);
          
          return record;
        });
        
        resolve(processedRecords);
        
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
