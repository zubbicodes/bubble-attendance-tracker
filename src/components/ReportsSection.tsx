import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, FileSpreadsheet, Users, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { calculateEmployeeStats } from '@/utils/attendanceUtils';
import { getExpectedWorkHours, getExpectedTimes, getDepartmentForEmployee } from '@/utils/departmentUtils';
import * as XLSX from 'xlsx';
import { EmployeeAttendance } from '@/types';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface EmployeeSummary {
  name: string;
  acNo: string;
  department: string;
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
  perfectAttendanceDays: number;
  mostFrequentStatus: string;
  firstAttendanceDate: string | null;
  lastAttendanceDate: string | null;
}

export default function ReportsSection() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [employeeSummaries, setEmployeeSummaries] = useState<EmployeeSummary[]>([]);
  const { toast } = useToast();

  const loadDataForDateRange = async () => {
    if (!dateRange.from || !dateRange.to) {
      toast({
        title: "Date range required",
        description: "Please select both start and end dates.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      console.log('Loading data for date range:', fromDate, 'to', toDate);

      // Fetch all attendance records for the date range
      const { data, error } = await supabase
        .from('daily_attendance')
        .select('*')
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: true });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        toast({
          title: "No data found",
          description: `No attendance records found for the selected date range.`,
          variant: "destructive",
        });
        setEmployeeSummaries([]);
        return;
      }

      // Transform database records to EmployeeAttendance format
      const attendanceRecords: EmployeeAttendance[] = data.map((record) => {
        const entryTime = record.in_time ? formatTimeIfNeeded(record.in_time) : null;
        const exitTime = record.out_time ? formatTimeIfNeeded(record.out_time) : null;
        
        let totalHours = record.total_minutes ? record.total_minutes / 60 : 0;
        if (!totalHours && entryTime && exitTime) {
          totalHours = calculateTotalHours(entryTime, exitTime);
        }
        
        const department = getDepartmentForEmployee(record.name);
        
        return {
          id: record.id,
          acNo: record.ac_no,
          name: record.name,
          date: record.date,
          entryTime,
          exitTime,
          department: department as any,
          status: record.status && record.status.length > 0 
            ? record.status[0] as any 
            : calculateStatusFromTimes(entryTime, exitTime, department),
          totalHours
        };
      });

      // Group records by employee and calculate summaries
      const employeeMap = new Map<string, EmployeeAttendance[]>();
      
      attendanceRecords.forEach(record => {
        if (!employeeMap.has(record.name)) {
          employeeMap.set(record.name, []);
        }
        employeeMap.get(record.name)!.push(record);
      });

      const summaries: EmployeeSummary[] = [];

      for (const [employeeName, records] of employeeMap) {
        const stats = calculateEmployeeStats(records);
        const firstRecord = records[0];
        
        summaries.push({
          name: employeeName,
          acNo: firstRecord.acNo,
          department: firstRecord.department,
          totalPresent: stats.totalPresent,
          totalWorkingHours: stats.totalWorkingHours,
          averageDailyHours: stats.averageDailyHours,
          lateEntries: stats.lateEntries,
          earlyExits: stats.earlyExits,
          shortfallHours: stats.shortfallHours,
          overtimeHours: stats.overtimeHours,
          sundayOvertimeHours: stats.sundayOvertimeHours,
          regularOvertimeHours: stats.regularOvertimeHours,
          sundaysWorked: stats.sundaysWorked,
          perfectAttendanceDays: stats.perfectAttendanceDays,
          mostFrequentStatus: stats.mostFrequentStatus,
          firstAttendanceDate: stats.firstAttendanceDate,
          lastAttendanceDate: stats.lastAttendanceDate,
        });
      }

      // Sort by total working hours (descending)
      summaries.sort((a, b) => b.totalWorkingHours - a.totalWorkingHours);

      setEmployeeSummaries(summaries);

      toast({
        title: "Data loaded successfully",
        description: `Loaded ${summaries.length} employee summaries for ${attendanceRecords.length} attendance records.`,
      });

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load attendance records from database",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateExcelReport = async () => {
    if (employeeSummaries.length === 0) {
      toast({
        title: "No data to export",
        description: "Please load data first before generating a report.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const fromDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
      const toDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : '';

      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Create employee summaries sheet
      const summaryData = employeeSummaries.map(summary => ({
        'Employee Name': summary.name,
        'Employee ID': summary.acNo,
        'Department': summary.department,
        'Present Days': summary.totalPresent,
        'Total Working Hours': summary.totalWorkingHours.toFixed(2),
        'Average Daily Hours': summary.averageDailyHours.toFixed(2),
        'Late Entries': summary.lateEntries,
        'Early Exits': summary.earlyExits,
        'Shortfall Hours': summary.shortfallHours.toFixed(2),
        'Overtime Hours': summary.overtimeHours.toFixed(2),
        'Sunday Overtime': summary.sundayOvertimeHours.toFixed(2),
        'Regular Overtime': summary.regularOvertimeHours.toFixed(2),
        'Sundays Worked': summary.sundaysWorked,
        'Perfect Attendance Days': summary.perfectAttendanceDays,
        'Most Frequent Status': formatStatus(summary.mostFrequentStatus),
        'First Attendance Date': summary.firstAttendanceDate ? formatDate(summary.firstAttendanceDate) : 'N/A',
        'Last Attendance Date': summary.lastAttendanceDate ? formatDate(summary.lastAttendanceDate) : 'N/A',
      }));

      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Employee Summaries');

      // Create department summary sheet
      const departmentMap = new Map<string, {
        totalEmployees: number;
        totalWorkingHours: number;
        totalOvertimeHours: number;
        totalShortfallHours: number;
        totalLateEntries: number;
        totalEarlyExits: number;
      }>();

      employeeSummaries.forEach(summary => {
        if (!departmentMap.has(summary.department)) {
          departmentMap.set(summary.department, {
            totalEmployees: 0,
            totalWorkingHours: 0,
            totalOvertimeHours: 0,
            totalShortfallHours: 0,
            totalLateEntries: 0,
            totalEarlyExits: 0,
          });
        }

        const dept = departmentMap.get(summary.department)!;
        dept.totalEmployees++;
        dept.totalWorkingHours += summary.totalWorkingHours;
        dept.totalOvertimeHours += summary.overtimeHours;
        dept.totalShortfallHours += summary.shortfallHours;
        dept.totalLateEntries += summary.lateEntries;
        dept.totalEarlyExits += summary.earlyExits;
      });

      const departmentData = Array.from(departmentMap.entries()).map(([dept, stats]) => ({
        'Department': dept,
        'Total Employees': stats.totalEmployees,
        'Total Working Hours': stats.totalWorkingHours.toFixed(2),
        'Total Overtime Hours': stats.totalOvertimeHours.toFixed(2),
        'Total Shortfall Hours': stats.totalShortfallHours.toFixed(2),
        'Total Late Entries': stats.totalLateEntries,
        'Total Early Exits': stats.totalEarlyExits,
        'Average Working Hours per Employee': (stats.totalWorkingHours / stats.totalEmployees).toFixed(2),
      }));

      const departmentSheet = XLSX.utils.json_to_sheet(departmentData);
      XLSX.utils.book_append_sheet(workbook, departmentSheet, 'Department Summary');

      // Create overall statistics sheet
      const totalEmployees = employeeSummaries.length;
      const totalWorkingHours = employeeSummaries.reduce((sum, emp) => sum + emp.totalWorkingHours, 0);
      const totalOvertimeHours = employeeSummaries.reduce((sum, emp) => sum + emp.overtimeHours, 0);
      const totalShortfallHours = employeeSummaries.reduce((sum, emp) => sum + emp.shortfallHours, 0);
      const totalLateEntries = employeeSummaries.reduce((sum, emp) => sum + emp.lateEntries, 0);
      const totalEarlyExits = employeeSummaries.reduce((sum, emp) => sum + emp.earlyExits, 0);

      const overallStats = [
        { 'Metric': 'Date Range', 'Value': `${fromDate} to ${toDate}` },
        { 'Metric': 'Total Employees', 'Value': totalEmployees },
        { 'Metric': 'Total Working Hours', 'Value': totalWorkingHours.toFixed(2) },
        { 'Metric': 'Total Overtime Hours', 'Value': totalOvertimeHours.toFixed(2) },
        { 'Metric': 'Total Shortfall Hours', 'Value': totalShortfallHours.toFixed(2) },
        { 'Metric': 'Total Late Entries', 'Value': totalLateEntries },
        { 'Metric': 'Total Early Exits', 'Value': totalEarlyExits },
        { 'Metric': 'Average Working Hours per Employee', 'Value': (totalWorkingHours / totalEmployees).toFixed(2) },
        { 'Metric': 'Average Overtime Hours per Employee', 'Value': (totalOvertimeHours / totalEmployees).toFixed(2) },
        { 'Metric': 'Average Shortfall Hours per Employee', 'Value': (totalShortfallHours / totalEmployees).toFixed(2) },
      ];

      const statsSheet = XLSX.utils.json_to_sheet(overallStats);
      XLSX.utils.book_append_sheet(workbook, statsSheet, 'Overall Statistics');

      // Generate Excel file
      const excelFileName = `Attendance_Report_${fromDate}_to_${toDate}.xlsx`;
      XLSX.writeFile(workbook, excelFileName);

      toast({
        title: "Report generated successfully",
        description: `Excel report "${excelFileName}" has been downloaded.`,
      });

    } catch (error) {
      console.error('Failed to generate Excel report:', error);
      toast({
        title: "Error generating report",
        description: "Failed to generate Excel report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper functions
  function formatTimeIfNeeded(timeStr: string): string {
    if (!timeStr) return '';
    
    // If it's already in HH:MM AM/PM format, return as is
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      return timeStr;
    }
    
    // Convert from minutes to HH:MM AM/PM format
    const minutes = parseInt(timeStr, 10);
    if (isNaN(minutes)) return timeStr;
    
    return minutesToTimeAMPM(minutes);
  }

  function minutesToTimeAMPM(minutes: number): string {
    const hours24 = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    
    return `${hours12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
  }

  function calculateTotalHours(entryTime: string, exitTime: string): number {
    const entryMinutes = timeToMinutes(entryTime);
    const exitMinutes = timeToMinutes(exitTime);
    
    const diffMinutes = exitMinutes < entryMinutes 
      ? (24 * 60 - entryMinutes) + exitMinutes
      : exitMinutes - entryMinutes;
    
    return parseFloat((diffMinutes / 60).toFixed(2));
  }

  function timeToMinutes(time: string): number {
    if (!time) return 0;
    
    if (time.includes('AM') || time.includes('PM')) {
      const [timePart, period] = time.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      
      if (period === 'PM' && hours < 12) {
        hours += 12;
      }
      if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return hours * 60 + (minutes || 0);
    }
    
    const parts = time.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    
    return hours * 60 + minutes;
  }



  function calculateStatusFromTimes(entryTime: string | null, exitTime: string | null, department: any): string {
    if (!entryTime || !exitTime) return 'missingCheckout';
    return 'onTime'; // Simplified - you might want to implement proper status calculation
  }

  function formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'onTime': 'On Time',
      'lateEntry': 'Late Entry',
      'earlyExit': 'Early Exit',
      'missingCheckout': 'Missing Checkout',
      'lessHours': 'Less Hours',
      'overtime': 'Overtime'
    };
    return statusMap[status] || status;
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Reports & Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Generate comprehensive reports of employee attendance data from Supabase based on selected date ranges.
          </p>
          
          {/* Date Range Selection */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">From:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, 'PP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">To:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, 'PP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <Button 
              onClick={loadDataForDateRange}
              disabled={isLoading || !dateRange.from || !dateRange.to}
            >
              {isLoading ? 'Loading...' : 'Load Data'}
            </Button>
          </div>

          {/* Data Summary */}
          {employeeSummaries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Employees</p>
                  <p className="text-lg font-bold text-blue-700">{employeeSummaries.length}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <Clock className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">Total Hours</p>
                  <p className="text-lg font-bold text-green-700">
                    {employeeSummaries.reduce((sum, emp) => sum + emp.totalWorkingHours, 0).toFixed(1)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-900">Overtime Hours</p>
                  <p className="text-lg font-bold text-orange-700">
                    {employeeSummaries.reduce((sum, emp) => sum + emp.overtimeHours, 0).toFixed(1)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-900">Shortfall Hours</p>
                  <p className="text-lg font-bold text-red-700">
                    {employeeSummaries.reduce((sum, emp) => sum + emp.shortfallHours, 0).toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Employee Summaries Table */}
          {employeeSummaries.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Employee Summaries</h3>
                <Button 
                  onClick={generateExcelReport}
                  disabled={isGenerating}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isGenerating ? 'Generating...' : 'Export to Excel'}
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Employee</th>
                        <th className="px-4 py-3 text-left font-medium">Department</th>
                        <th className="px-4 py-3 text-left font-medium">Present Days</th>
                        <th className="px-4 py-3 text-left font-medium">Total Hours</th>
                        <th className="px-4 py-3 text-left font-medium">Avg Daily</th>
                        <th className="px-4 py-3 text-left font-medium">Overtime</th>
                        <th className="px-4 py-3 text-left font-medium">Shortfall</th>
                        <th className="px-4 py-3 text-left font-medium">Late Entries</th>
                        <th className="px-4 py-3 text-left font-medium">Early Exits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {employeeSummaries.map((employee, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{employee.name}</td>
                          <td className="px-4 py-3">{employee.department}</td>
                          <td className="px-4 py-3">{employee.totalPresent}</td>
                          <td className="px-4 py-3">{employee.totalWorkingHours.toFixed(1)}</td>
                          <td className="px-4 py-3">{employee.averageDailyHours.toFixed(1)}</td>
                          <td className="px-4 py-3 text-green-600">{employee.overtimeHours.toFixed(1)}</td>
                          <td className="px-4 py-3 text-red-600">{employee.shortfallHours.toFixed(1)}</td>
                          <td className="px-4 py-3">{employee.lateEntries}</td>
                          <td className="px-4 py-3">{employee.earlyExits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 