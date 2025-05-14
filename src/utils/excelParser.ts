
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
        
        // Process each row and track entries by employee
        const employeeEntries: Record<string, { 
          entries: Array<{timeStr: string, exception: string, operation: string}>,
          acNo: string,
          name: string
        }> = {};
        
        // First, collect all entries for each employee
        jsonData.forEach((row: any) => {
          const acNo = row['AC.No.'] || row['AC No'] || row['AC.No'] || '';
          const name = row['Name'] || '';
          const timeStr = row['Time'] || '';
          const operation = row['Operation'] || '';
          const exception = row['Exception'] || '';
          
          if (!timeStr) return; // Skip rows without time
          
          const key = `${acNo}-${name}`;
          
          if (!employeeEntries[key]) {
            employeeEntries[key] = {
              entries: [],
              acNo,
              name
            };
          }
          
          employeeEntries[key].entries.push({
            timeStr,
            exception,
            operation
          });
        });
        
        // Then, process entries to create attendance records
        const attendanceRecords: EmployeeAttendance[] = [];
        
        for (const key in employeeEntries) {
          const { entries, acNo, name } = employeeEntries[key];
          
          // Sort entries by time to ensure chronological order
          entries.sort((a, b) => {
            const timeA = a.timeStr.split(' ')[1] || '';
            const timeB = b.timeStr.split(' ')[1] || '';
            return timeA.localeCompare(timeB);
          });
          
          // Always take first entry as check-in and second as check-out
          if (entries.length >= 2) {
            const entryTime = entries[0].timeStr.split(' ')[1] || '';
            const exitTime = entries[entries.length - 1].timeStr.split(' ')[1] || '';
            
            const department = getDepartmentForEmployee(name);
            
            attendanceRecords.push({
              id: uuidv4(),
              acNo,
              name,
              date: dateString,
              entryTime,
              exitTime,
              department,
              status: 'onTime' as AttendanceStatus, // Will be calculated later
              totalHours: 0, // Will be calculated later
              exception: entries[0].exception || entries[1].exception, // Use exception from entries
              operation: entries[0].operation || entries[1].operation // Use operation from entries
            });
          } else if (entries.length === 1) {
            // If only one entry is found, treat it as check-in with missing checkout
            const entryTime = entries[0].timeStr.split(' ')[1] || '';
            
            const department = getDepartmentForEmployee(name);
            
            attendanceRecords.push({
              id: uuidv4(),
              acNo,
              name,
              date: dateString,
              entryTime,
              exitTime: null, // Missing check-out
              department,
              status: 'missingCheckout' as AttendanceStatus,
              totalHours: 0,
              exception: entries[0].exception,
              operation: entries[0].operation
            });
          }
        }
        
        // Calculate status and total hours for each record
        const processedRecords = attendanceRecords.map(record => {
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
