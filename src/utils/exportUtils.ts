
import * as XLSX from 'xlsx';
import { EmployeeAttendance } from '@/types';
import { loadEmployeeHistory, calculateEmployeeStats } from './attendanceUtils';
import { getExpectedWorkHours, getExpectedTimes } from './departmentUtils';
import html2canvas from 'html2canvas';

export async function downloadExcel(employee: EmployeeAttendance) {
  try {
    // Fetch employee history
    const attendanceHistory = await loadEmployeeHistory(employee.name);
    
    // Sort by date (newest to oldest)
    const sortedHistory = [...attendanceHistory].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Calculate statistics for different periods
    const stats7Days = calculateEmployeeStats(attendanceHistory, 7);
    const stats30Days = calculateEmployeeStats(attendanceHistory, 30);
    const statsAllTime = calculateEmployeeStats(attendanceHistory);
    
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Create attendance records sheet
    const attendanceData = sortedHistory.map(record => ({
      'Date': formatDate(record.date),
      'Entry Time': record.entryTime || 'Missing',
      'Exit Time': record.exitTime || 'Missing',
      'Total Hours': record.totalHours.toFixed(2),
      'Status': formatStatus(record.status),
      'Expected Hours': getExpectedWorkHours(record.name, record.department)
    }));
    
    const attendanceSheet = XLSX.utils.json_to_sheet(attendanceData);
    XLSX.utils.book_append_sheet(workbook, attendanceSheet, 'Attendance Records');
    
    // Create statistics summary sheet
    const statsData = [
      { 'Period': 'Last 7 Days', ...formatStats(stats7Days) },
      { 'Period': 'Last 30 Days', ...formatStats(stats30Days) },
      { 'Period': 'All Time', ...formatStats(statsAllTime) }
    ];
    
    const statsSheet = XLSX.utils.json_to_sheet(statsData);
    XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistics Summary');
    
    // Create employee info sheet
    const expectedTimes = getExpectedTimes(employee.name, employee.department);
    const employeeInfo = [
      { 'Property': 'Name', 'Value': employee.name },
      { 'Property': 'Employee ID', 'Value': employee.acNo },
      { 'Property': 'Department', 'Value': employee.department },
      { 'Property': 'Expected Entry Time', 'Value': expectedTimes.entry },
      { 'Property': 'Expected Exit Time', 'Value': expectedTimes.exit },
      { 'Property': 'Expected Work Hours', 'Value': getExpectedWorkHours(employee.name, employee.department) }
    ];
    
    const infoSheet = XLSX.utils.json_to_sheet(employeeInfo);
    XLSX.utils.book_append_sheet(workbook, infoSheet, 'Employee Info');
    
    // Try to capture and add charts if possible
    try {
      await captureAndAddCharts(workbook, employee.name);
    } catch (chartError) {
      console.error('Failed to capture charts:', chartError);
      // Continue without charts if there's an error
    }
    
    // Generate Excel file
    const excelFileName = `${employee.name.replace(/\s+/g, '_')}_Stats_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Write the workbook and trigger download
    XLSX.writeFile(workbook, excelFileName);
    
    return true;
  } catch (error) {
    console.error('Failed to generate Excel file:', error);
    return false;
  }
}

// Helper function to capture charts and add to workbook
async function captureAndAddCharts(workbook: XLSX.WorkBook, employeeName: string) {
  // Check if charts are in the DOM
  const lineChartElement = document.querySelector('.employee-stats-line-chart');
  const barChartElement = document.querySelector('.employee-stats-bar-chart');
  
  if (!lineChartElement && !barChartElement) return;
  
  const canvasPromises = [];
  
  if (lineChartElement) {
    canvasPromises.push(html2canvas(lineChartElement as HTMLElement)
      .then(canvas => {
        // Convert canvas to base64 image
        const imgData = canvas.toDataURL('image/png');
        
        // Create a worksheet with the image
        const ws = XLSX.utils.aoa_to_sheet([
          ['Working Hours Chart'],
          ['']
        ]);
        
        // Add the image to the worksheet
        const imageId = workbook.addImage({
          base64: imgData,
          extension: 'png',
        });
        
        ws['!images'] = [
          { 
            name: 'working-hours.png',
            data: imgData,
            position: {
              type: 'twoCellAnchor',
              from: { col: 0, row: 1 },
              to: { col: 10, row: 20 }
            }
          }
        ];
        
        XLSX.utils.book_append_sheet(workbook, ws, 'Working Hours Chart');
      }));
  }
  
  if (barChartElement) {
    canvasPromises.push(html2canvas(barChartElement as HTMLElement)
      .then(canvas => {
        // Convert canvas to base64 image
        const imgData = canvas.toDataURL('image/png');
        
        // Create a worksheet with the image
        const ws = XLSX.utils.aoa_to_sheet([
          ['Attendance Status Chart'],
          ['']
        ]);
        
        // Add the image to the worksheet
        const imageId = workbook.addImage({
          base64: imgData,
          extension: 'png',
        });
        
        ws['!images'] = [
          { 
            name: 'attendance-status.png',
            data: imgData,
            position: {
              type: 'twoCellAnchor',
              from: { col: 0, row: 1 },
              to: { col: 10, row: 20 }
            }
          }
        ];
        
        XLSX.utils.book_append_sheet(workbook, ws, 'Attendance Status Chart');
      }));
  }
  
  await Promise.all(canvasPromises);
}

// Helper function to format date
function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Helper function to format status
function formatStatus(status: string): string {
  switch(status) {
    case 'onTime': return 'On Time';
    case 'lateEntry': return 'Late Entry';
    case 'earlyExit': return 'Early Exit';
    case 'missingCheckout': return 'Missing Checkout';
    case 'lessHours': return 'Less Hours';
    default: return status;
  }
}

// Helper function to format stats for the Excel sheet
function formatStats(stats: any) {
  return {
    'Present Days': stats.totalPresent,
    'Total Working Hours': stats.totalWorkingHours.toFixed(2),
    'Average Daily Hours': stats.averageDailyHours.toFixed(2),
    'Late Entries': stats.lateEntries,
    'Early Exits': stats.earlyExits,
    'Shortfall Hours': stats.shortfallHours.toFixed(2),
    'Overtime Hours': stats.overtimeHours.toFixed(2)
  };
}
