
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
        console.log('Raw Excel data:', jsonData);
        
        // Extract date from file name or use current date
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
        
        // Group entries by employee
        const employeeMap: Record<string, { 
          entries: Array<{time: Date, timeStr: string, exception: string, operation: string}>,
          acNo: string, 
          name: string 
        }> = {};
        
        // Process each row to extract employee entries
        jsonData.forEach((row: any) => {
          const acNo = row['AC.No.'] || row['AC No'] || row['AC.No'] || '';
          const name = row['Name'] || '';
          const timeStr = row['Time'] || '';
          const operation = row['Operation'] || '';
          const exception = row['Exception'] || '';
          
          if (!timeStr || !name) return; // Skip rows without time or name
          
          // Parse the time string to a Date object
          let timeDate: Date | null = null;
          
          try {
            // Handle various time formats
            if (typeof timeStr === 'string') {
              // Check if the time string contains AM/PM
              if (timeStr.includes('AM') || timeStr.includes('PM')) {
                // Format like "5/13/2025 9:26 AM"
                timeDate = new Date(timeStr);
              } else if (timeStr.includes('/') || timeStr.includes('-')) {
                // Format like "5/13/2025 09:26"
                timeDate = new Date(timeStr);
              } else {
                // Format like "09:26"
                const [hours, minutes] = timeStr.split(':').map(Number);
                timeDate = new Date();
                timeDate.setHours(hours, minutes, 0);
              }
            } else if (typeof timeStr === 'number') {
              // Excel serial date format
              timeDate = XLSX.SSF.parse_date_code(timeStr);
            }
            
            if (!timeDate || isNaN(timeDate.getTime())) {
              console.warn(`Invalid time format: ${timeStr}`);
              return;
            }
          } catch (err) {
            console.warn(`Error parsing time: ${timeStr}`, err);
            return;
          }
          
          // Create a key for this employee
          const key = `${acNo}-${name}`;
          
          if (!employeeMap[key]) {
            employeeMap[key] = {
              entries: [],
              acNo,
              name
            };
          }
          
          // Add this entry to the employee's records
          employeeMap[key].entries.push({
            time: timeDate,
            timeStr,
            exception,
            operation
          });
        });
        
        // Process employee entries to create attendance records
        const attendanceRecords: EmployeeAttendance[] = [];
        
        for (const key in employeeMap) {
          const { entries, acNo, name } = employeeMap[key];
          
          // Skip if no entries found
          if (entries.length === 0) continue;
          
          // Sort entries chronologically by the parsed Date object
          entries.sort((a, b) => a.time.getTime() - b.time.getTime());
          console.log(`Sorted entries for ${name}:`, entries.map(e => e.timeStr));
          
          // First entry is check-in, last entry is check-out
          const checkInEntry = entries[0];
          const checkOutEntry = entries.length > 1 ? entries[entries.length - 1] : null;
          
          // Format times for display - ensure it's in HH:MM format from AM/PM
          const formatTimeFromStr = (timeStr: string): string => {
            try {
              if (!timeStr) return '';
              
              // Extract just the time part if it contains a date
              let timePart = timeStr;
              if (timeStr.includes('/') || timeStr.includes('-')) {
                timePart = timeStr.split(' ').slice(1).join(' ');
              }
              
              // Parse the time, handling AM/PM
              const isPM = timePart.toLowerCase().includes('pm');
              const isAM = timePart.toLowerCase().includes('am');
              
              if (isPM || isAM) {
                // Extract hours and minutes
                const timeRegex = /(\d+):(\d+)(?:\s*([APap][Mm]))?/;
                const match = timePart.match(timeRegex);
                
                if (match) {
                  let [_, hours, minutes] = match;
                  let hourNum = parseInt(hours, 10);
                  
                  // Convert 12-hour to 24-hour format
                  if (isPM && hourNum < 12) hourNum += 12;
                  if (isAM && hourNum === 12) hourNum = 0;
                  
                  return `${hourNum.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
                }
              }
              
              // If no AM/PM or couldn't parse, return the time part as is
              return timePart.replace(/[APap][Mm]/, '').trim();
            } catch (err) {
              console.warn(`Error formatting time: ${timeStr}`, err);
              return timeStr;
            }
          };
          
          const entryTime = formatTimeFromStr(checkInEntry.timeStr);
          const exitTime = checkOutEntry ? formatTimeFromStr(checkOutEntry.timeStr) : null;
          
          console.log(`${name}: Entry=${entryTime}, Exit=${exitTime}`);
          
          // Determine department
          const department = getDepartmentForEmployee(name);
          
          // Create attendance record
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
            exception: checkInEntry.exception || (checkOutEntry?.exception || ''),
            operation: checkInEntry.operation || (checkOutEntry?.operation || '')
          });
        }
        
        // Calculate attendance status and total hours
        const processedRecords = attendanceRecords.map(record => {
          // Calculate total hours if both entry and exit times exist
          if (record.entryTime && record.exitTime) {
            record.totalHours = calculateTotalHours(record.entryTime, record.exitTime);
          }
          
          // Calculate attendance status
          record.status = calculateAttendanceStatus(record);
          
          return record;
        });
        
        console.log('Processed attendance records:', processedRecords);
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
