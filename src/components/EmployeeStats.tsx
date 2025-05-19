import { useAttendance } from '@/contexts/AttendanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Period, StatsMap } from '@/types';
import { calculateEmployeeStats, loadEmployeeHistory, getFirstDayOfMonth } from '@/utils/attendanceUtils';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { 
  ChartContainer, 
  ChartTooltip,
  ChartTooltipContent 
} from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface EmployeeStatsProps {
  inPanel?: boolean;
}

export default function EmployeeStats({ inPanel = false }: EmployeeStatsProps) {
  const { selectedEmployee } = useAttendance();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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
  const [chartData, setChartData] = useState<any[]>([]);
  const [dailyHoursData, setDailyHoursData] = useState<any[]>([]);

  useEffect(() => {
    const fetchEmployeeHistory = async () => {
      if (!selectedEmployee) return;
      
      setIsLoading(true);
      try {
        // Fetch all historical data for this employee
        const allRecords = await loadEmployeeHistory(selectedEmployee.name);
        
        // Calculate stats for each period
        const stats = {
          '7days': calculateEmployeeStats(allRecords, 7),
          '30days': calculateEmployeeStats(allRecords, null, getFirstDayOfMonth()),
          'allTime': calculateEmployeeStats(allRecords)
        };
        
        setEmployeeStats(stats);
        
        // Prepare status distribution chart data
        const chartData = [
          {
            name: "On Time",
            value: allRecords.filter(r => r.status === 'onTime').length,
            fill: "#22c55e"
          },
          {
            name: "Late Entry",
            value: allRecords.filter(r => r.status === 'lateEntry').length,
            fill: "#eab308"
          },
          {
            name: "Early Exit",
            value: allRecords.filter(r => r.status === 'earlyExit').length,
            fill: "#f97316"
          },
          {
            name: "Missing Checkout",
            value: allRecords.filter(r => r.status === 'missingCheckout').length,
            fill: "#ef4444"
          },
          {
            name: "Less Hours",
            value: allRecords.filter(r => r.status === 'lessHours').length,
            fill: "#8b5cf6"
          }
        ];
        
        setChartData(chartData);
        
        // Prepare daily working hours data for line chart
        // Sort by date ascending to show proper timeline
        const sortedRecords = [...allRecords].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        // Get the last 14 days of data to keep chart readable
        const recentRecords = sortedRecords.slice(-14);
        
        const dailyData = recentRecords.map(record => ({
          date: new Date(record.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }),
          hours: record.status === 'missingCheckout' ? 0 : record.totalHours,
          status: record.status
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

  if (!selectedEmployee) {
    return null;
  }

  // Safe formatting function to handle potentially undefined numbers
  const formatSafely = (value: number | undefined, decimals: number = 1): string => {
    if (value === undefined || value === null) return '0.0';
    return value.toFixed(decimals);
  };

  // Add this helper for status label
  const statusLabels: Record<string, string> = {
    onTime: 'On Time',
    lateEntry: 'Late Entry',
    earlyExit: 'Early Exit',
    missingCheckout: 'Missing Checkout',
    lessHours: 'Less Working Hours',
    overtime: 'Overtime',
  };

  // If in panel mode, render complete stats in the sheet
  if (inPanel) {
    return (
      <div className="w-full">
        {isLoading ? (
          <div className="flex justify-center py-4">Loading employee history...</div>
        ) : (
          <Tabs defaultValue="7days">
            <TabsList className="mb-4">
              <TabsTrigger value="7days">Last 7 Days</TabsTrigger>
              <TabsTrigger value="30days">This Month</TabsTrigger>
              <TabsTrigger value="allTime">All Time</TabsTrigger>
            </TabsList>

            {(['7days', '30days', 'allTime'] as Period[]).map((period) => (
              <TabsContent key={period} value={period}>
                <div className="grid gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <StatCard
                      title="Present Days"
                      value={employeeStats[period].totalPresent}
                    />
                    <StatCard
                      title="Working Hours"
                      value={formatSafely(employeeStats[period].totalWorkingHours)}
                      unit="hrs"
                    />
                    <StatCard
                      title="Avg. Daily"
                      value={formatSafely(employeeStats[period].averageDailyHours)}
                      unit="hrs/day"
                    />
                    <StatCard
                      title="Late Entries"
                      value={employeeStats[period].lateEntries}
                    />
                    <StatCard
                      title="Early Exits"
                      value={employeeStats[period].earlyExits}
                    />
                    <StatCard
                      title="Shortfall"
                      value={formatSafely(employeeStats[period].shortfallHours)}
                      unit="hrs"
                      highlight={employeeStats[period].shortfallHours > 0}
                      highlightColor="text-red-500"
                    />
                    <StatCard
                      title="Overtime"
                      value={formatSafely(employeeStats[period].overtimeHours)}
                      unit="hrs"
                      highlight={employeeStats[period].overtimeHours > 0}
                      highlightColor="text-green-500"
                    />
                  </div>

                  {/* Detailed Overtime & Attendance Stats */}
                  {employeeStats[period].overtimeHours > 0 && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <div className="font-semibold mb-2">Overtime Details</div>
                        <div className="flex flex-col gap-1 text-sm">
                          <span>Total Overtime: <b>{formatSafely(employeeStats[period].overtimeHours)}</b> hrs</span>
                          <span>Sunday Overtime: <b>{formatSafely(employeeStats[period].sundayOvertimeHours)}</b> hrs ({employeeStats[period].sundaysWorked} Sundays)</span>
                          <span>Regular Overtime: <b>{formatSafely(employeeStats[period].regularOvertimeHours)}</b> hrs</span>
                          {employeeStats[period].longestOvertimeDay && (
                            <span>Longest Overtime Day: <b>{employeeStats[period].longestOvertimeDay.date}</b> ({employeeStats[period].longestOvertimeDay.hours} hrs)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Daily Working Hours Line Chart */}
                  <div className="mt-4 employee-stats-line-chart">
                    <h3 className="text-sm font-medium mb-3">Daily Working Hours Trend</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyHoursData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }} 
                            tickMargin={10}
                          />
                          <YAxis 
                            tickMargin={10}
                            label={{ 
                              value: 'Hours', 
                              angle: -90, 
                              position: 'insideLeft',
                              style: { textAnchor: 'middle', fontSize: 12 }
                            }}
                          />
                          <Tooltip 
                            formatter={(value) => [`${Number(value).toFixed(2)} hrs`, 'Working Hours']}
                            labelFormatter={(label) => `Date: ${label}`}
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e2e8f0',
                              borderRadius: '0.375rem',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="hours" 
                            stroke="#2563eb" 
                            strokeWidth={2}
                            activeDot={{ r: 6, fill: "#2563eb", stroke: "white", strokeWidth: 2 }} 
                            dot={{ r: 4, fill: "#2563eb", stroke: "white", strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Attendance Status Chart */}
                  <div className="mt-4 employee-stats-bar-chart">
                    <h3 className="text-sm font-medium mb-3">Attendance Status Distribution</h3>
                    <div className="h-64">
                      <ChartContainer config={{}} className="h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <ChartTooltip
                              content={({ active, payload }) => (
                                <ChartTooltipContent
                                  active={active}
                                  payload={payload}
                                />
                              )}
                            />
                            <Bar dataKey="value" name="Hours" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    );
  }

  // If on main page, render a compact summary card that can expand
  return (
    <Card className="w-full mt-6" id="employee-stats-section">
      <CardHeader className="pb-0">
        <CardTitle className="text-lg">
          <div className="flex items-center justify-between">
            <div>{selectedEmployee.name}</div>
            <div className="text-sm text-muted-foreground">
              ID: {selectedEmployee.acNo} • {selectedEmployee.department}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">Loading employee summary...</div>
        ) : (
          <Collapsible 
            open={isExpanded} 
            onOpenChange={setIsExpanded}
            className="space-y-2"
          >
            {/* Always visible summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2">
              <StatCard
                title="Today's Hours"
                value={formatSafely(selectedEmployee.totalHours)}
                unit="hrs"
              />
              <StatCard
                title="Status"
                value={selectedEmployee.status}
                isStatus={true}
              />
              <StatCard
                title="Avg. Daily (30 days)"
                value={formatSafely(employeeStats['30days'].averageDailyHours)}
                unit="hrs/day"
              />
              <StatCard
                title="Total Present (30 days)"
                value={employeeStats['30days'].totalPresent}
                unit="days"
              />
            </div>
            
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-center w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
                {isExpanded ? "Show less" : "Show more"} 
                <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="pt-4 border-t">
                <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-4">
                  <StatCard
                    title="Late Entries (30d)"
                    value={employeeStats['30days'].lateEntries}
                  />
                  <StatCard
                    title="Early Exits (30d)"
                    value={employeeStats['30days'].earlyExits}
                  />
                  <StatCard
                    title="Shortfall (30d)"
                    value={formatSafely(employeeStats['30days'].shortfallHours)}
                    unit="hrs"
                    highlight={employeeStats['30days'].shortfallHours > 0}
                    highlightColor="text-red-500"
                  />
                  <StatCard
                    title="Overtime (30d)"
                    value={formatSafely(employeeStats['30days'].overtimeHours)}
                    unit="hrs"
                    highlight={employeeStats['30days'].overtimeHours > 0}
                    highlightColor="text-green-500"
                  />
                </div>
                
                {/* Mini chart for days present */}
                <div className="h-32 mt-4">
                  <h3 className="text-xs font-medium mb-2">Daily Working Hours (Last 14 Days)</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyHoursData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10 }} 
                        tickMargin={5}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="hours" 
                        stroke="#2563eb" 
                        strokeWidth={2}
                        dot={{ r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

interface StatCardProps { 
  title: string; 
  value: number | string; 
  unit?: string;
  highlight?: boolean;
  highlightColor?: string;
  isStatus?: boolean;
}

function StatCard({ 
  title, 
  value, 
  unit,
  highlight = false,
  highlightColor = '',
  isStatus = false
}: StatCardProps) {
  // For status values, apply appropriate styling
  if (isStatus && typeof value === 'string') {
    const getStatusColor = (status: string) => {
      switch(status) {
        case 'onTime': return 'bg-green-100 text-green-800';
        case 'lateEntry': return 'bg-yellow-100 text-yellow-800';
        case 'earlyExit': return 'bg-orange-100 text-orange-800';
        case 'missingCheckout': return 'bg-red-100 text-red-800';
        case 'lessHours': return 'bg-blue-100 text-blue-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const statusColor = getStatusColor(value);
    
    return (
      <div className="bg-muted/30 p-3 rounded-lg">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="mt-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
            {value}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 p-3 rounded-lg">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className={`text-lg font-semibold flex items-center gap-1 ${highlight ? highlightColor : ''}`}>
        {value} {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}
