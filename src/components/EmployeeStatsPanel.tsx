import { useAttendance } from '@/contexts/AttendanceContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { getExpectedWorkHours, isFemaleStaff } from '@/utils/departmentUtils';
import { Button } from '@/components/ui/button';
import { downloadExcel } from '@/utils/exportUtils';
import { FileSpreadsheet, Mail, Phone, Calendar, Briefcase, Users, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { calculateEmployeeStats, loadEmployeeHistory, getFirstDayOfMonth } from '@/utils/attendanceUtils';
import { Period, StatsMap } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function EmployeeStatsPanel() {
  const { selectedEmployee, setSelectedEmployee } = useAttendance();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [employeeStats, setEmployeeStats] = useState<StatsMap>({
    '7days': {
      totalPresent: 0,
      totalWorkingHours: 0,
      averageDailyHours: 0,
      lateEntries: 0,
      earlyExits: 0,
      shortfallHours: 0,
      overtimeHours: 0,
      sundayOvertimeHours: 0,
      regularOvertimeHours: 0,
      sundaysWorked: 0,
      longestOvertimeDay: null,
      perfectAttendanceDays: 0,
      mostFrequentStatus: '',
      firstAttendanceDate: null,
      lastAttendanceDate: null,
    },
    '30days': {
      totalPresent: 0,
      totalWorkingHours: 0,
      averageDailyHours: 0,
      lateEntries: 0,
      earlyExits: 0,
      shortfallHours: 0,
      overtimeHours: 0,
      sundayOvertimeHours: 0,
      regularOvertimeHours: 0,
      sundaysWorked: 0,
      longestOvertimeDay: null,
      perfectAttendanceDays: 0,
      mostFrequentStatus: '',
      firstAttendanceDate: null,
      lastAttendanceDate: null,
    },
    'allTime': {
      totalPresent: 0,
      totalWorkingHours: 0,
      averageDailyHours: 0,
      lateEntries: 0,
      earlyExits: 0,
      shortfallHours: 0,
      overtimeHours: 0,
      sundayOvertimeHours: 0,
      regularOvertimeHours: 0,
      sundaysWorked: 0,
      longestOvertimeDay: null,
      perfectAttendanceDays: 0,
      mostFrequentStatus: '',
      firstAttendanceDate: null,
      lastAttendanceDate: null,
    }
  });
  const [dailyHoursData, setDailyHoursData] = useState<any[]>([]);
  
  const isOpen = !!selectedEmployee;
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedEmployee(null);
    }
  };

  useEffect(() => {
    const fetchEmployeeHistory = async () => {
      if (!selectedEmployee) return;
      
      setIsLoading(true);
      try {
        const allRecords = await loadEmployeeHistory(selectedEmployee.name);
        
        const stats = {
          '7days': calculateEmployeeStats(allRecords, 7),
          '30days': calculateEmployeeStats(allRecords, null, getFirstDayOfMonth()),
          'allTime': calculateEmployeeStats(allRecords)
        };
        
        setEmployeeStats(stats);
        
        const sortedRecords = [...allRecords].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        const recentRecords = sortedRecords.slice(-14);
        
        const dailyData = recentRecords.map(record => ({
          date: new Date(record.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }),
          hours: record.status === 'missingCheckout' ? 0 : record.totalHours,
        }));
        
        setDailyHoursData(dailyData);
      } catch (error) {
        console.error('Error fetching employee history:', error);
        toast({
          title: "Error loading employee history",
          description: "Failed to load historical attendance data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployeeHistory();
  }, [selectedEmployee, toast]);

  const handleExport = async () => {
    if (selectedEmployee) {
      setIsExporting(true);
      try {
        await downloadExcel(selectedEmployee);
        toast({
          title: "Export Successful",
          description: "Employee stats have been exported to Excel",
        });
      } catch (error) {
        toast({
          title: "Export Failed",
          description: "Failed to export employee stats",
          variant: "destructive",
        });
      } finally {
        setIsExporting(false);
      }
    }
  };

  const formatSafely = (value: number | undefined, decimals: number = 1): string => {
    if (value === undefined || value === null) return '0.0';
    return value.toFixed(decimals);
  };

  if (!selectedEmployee) return null;

  const expectedHours = getExpectedWorkHours(selectedEmployee.name, selectedEmployee.department);
  const isFemale = isFemaleStaff(selectedEmployee.name);

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading employee details...</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <SheetHeader className="px-6 py-4 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle className="text-xl">Profile Details</SheetTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Dashboard / Attendance List / Profile Details
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  {isExporting ? 'Exporting...' : 'Export Stats'}
                </Button>
              </div>
            </SheetHeader>

            <div className="p-6 space-y-6">
              {/* Employee Info Card */}
              <Card className="border-border/40">
                <CardContent className="p-6">
                  <div className="flex items-start gap-6">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-3xl font-bold text-primary">
                        {selectedEmployee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-2xl font-semibold mb-1">
                        {selectedEmployee.name}
                        {isFemale && (
                          <span className="ml-2 text-xs font-semibold text-pink-500 bg-pink-50 rounded-full px-2 py-0.5">
                            F
                          </span>
                        )}
                      </h3>
                      <p className="text-muted-foreground mb-4 capitalize">
                        {selectedEmployee.department} Department
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Employee ID:</span>
                          <span className="font-medium">{selectedEmployee.acNo}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Department:</span>
                          <span className="font-medium capitalize">{selectedEmployee.department}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Expected Hours:</span>
                          <span className="font-medium">{expectedHours} hours/day</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Tabs */}
              <Tabs defaultValue="30days" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="7days">Last 7 Days</TabsTrigger>
                  <TabsTrigger value="30days">This Month</TabsTrigger>
                  <TabsTrigger value="allTime">All Time</TabsTrigger>
                </TabsList>

                {(['7days', '30days', 'allTime'] as Period[]).map((period) => (
                  <TabsContent key={period} value={period} className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="border-border/40">
                        <CardContent className="p-4">
                          <div className="text-sm text-muted-foreground mb-1">Present Days</div>
                          <div className="text-2xl font-bold">{employeeStats[period].totalPresent}</div>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-border/40">
                        <CardContent className="p-4">
                          <div className="text-sm text-muted-foreground mb-1">Working Hours</div>
                          <div className="text-2xl font-bold">
                            {formatSafely(employeeStats[period].totalWorkingHours)}
                            <span className="text-sm font-normal text-muted-foreground ml-1">hrs</span>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-border/40">
                        <CardContent className="p-4">
                          <div className="text-sm text-muted-foreground mb-1">Avg. Daily</div>
                          <div className="text-2xl font-bold">
                            {formatSafely(employeeStats[period].averageDailyHours)}
                            <span className="text-sm font-normal text-muted-foreground ml-1">hrs/day</span>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-border/40">
                        <CardContent className="p-4">
                          <div className="text-sm text-muted-foreground mb-1">Late Entries</div>
                          <div className="text-2xl font-bold">{employeeStats[period].lateEntries}</div>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-border/40">
                        <CardContent className="p-4">
                          <div className="text-sm text-muted-foreground mb-1">Early Exits</div>
                          <div className="text-2xl font-bold">{employeeStats[period].earlyExits}</div>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-border/40">
                        <CardContent className="p-4">
                          <div className="text-sm text-muted-foreground mb-1">Shortfall</div>
                          <div className={`text-2xl font-bold ${employeeStats[period].shortfallHours > 0 ? 'text-destructive' : ''}`}>
                            {formatSafely(employeeStats[period].shortfallHours)}
                            <span className="text-sm font-normal text-muted-foreground ml-1">hrs</span>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-border/40">
                        <CardContent className="p-4">
                          <div className="text-sm text-muted-foreground mb-1">Overtime</div>
                          <div className={`text-2xl font-bold ${employeeStats[period].overtimeHours > 0 ? 'text-green-600' : ''}`}>
                            {formatSafely(employeeStats[period].overtimeHours)}
                            <span className="text-sm font-normal text-muted-foreground ml-1">hrs</span>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-border/40">
                        <CardContent className="p-4">
                          <div className="text-sm text-muted-foreground mb-1">Perfect Days</div>
                          <div className="text-2xl font-bold">{employeeStats[period].perfectAttendanceDays}</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Attendance Calendar / Chart */}
                    <Card className="border-border/40">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Daily Working Hours Trend</h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyHoursData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                              />
                              <YAxis 
                                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                label={{ 
                                  value: 'Hours', 
                                  angle: -90, 
                                  position: 'insideLeft',
                                  style: { fontSize: 12, fill: 'hsl(var(--muted-foreground))' }
                                }}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--background))', 
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '0.5rem',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="hours" 
                                stroke="hsl(var(--primary))" 
                                strokeWidth={2}
                                dot={{ r: 4, fill: "hsl(var(--primary))" }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
