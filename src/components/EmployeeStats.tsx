import { useAttendance } from '@/contexts/AttendanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Period, StatsMap } from '@/types';
import { calculateEmployeeStats, loadEmployeeHistory } from '@/utils/attendanceUtils';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { 
  ChartContainer, 
  ChartTooltip,
  ChartTooltipContent 
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function EmployeeStats() {
  const { selectedEmployee } = useAttendance();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [employeeStats, setEmployeeStats] = useState<StatsMap>({
    '7days': {
      totalPresent: 0,
      totalWorkingHours: 0,
      averageDailyHours: 0,
      lateEntries: 0,
      earlyExits: 0
    },
    '30days': {
      totalPresent: 0,
      totalWorkingHours: 0,
      averageDailyHours: 0,
      lateEntries: 0,
      earlyExits: 0
    },
    'allTime': {
      totalPresent: 0,
      totalWorkingHours: 0,
      averageDailyHours: 0,
      lateEntries: 0,
      earlyExits: 0
    }
  });
  const [chartData, setChartData] = useState<any[]>([]);

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
          '30days': calculateEmployeeStats(allRecords, 30),
          'allTime': calculateEmployeeStats(allRecords)
        };
        
        setEmployeeStats(stats);
        
        // Prepare chart data
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

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div>{selectedEmployee.name}</div>
          <div className="text-sm text-muted-foreground">
            ID: {selectedEmployee.acNo} • {selectedEmployee.department}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">Loading employee history...</div>
        ) : (
          <Tabs defaultValue="7days">
            <TabsList className="mb-4">
              <TabsTrigger value="7days">Last 7 Days</TabsTrigger>
              <TabsTrigger value="30days">Last 30 Days</TabsTrigger>
              <TabsTrigger value="allTime">All Time</TabsTrigger>
            </TabsList>

            {(['7days', '30days', 'allTime'] as Period[]).map((period) => (
              <TabsContent key={period} value={period}>
                <div className="grid gap-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StatCard
                      title="Present Days"
                      value={employeeStats[period].totalPresent}
                    />
                    <StatCard
                      title="Working Hours"
                      value={employeeStats[period].totalWorkingHours.toFixed(1)}
                      unit="hrs"
                    />
                    <StatCard
                      title="Avg. Daily"
                      value={employeeStats[period].averageDailyHours.toFixed(1)}
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
                  </div>
                  
                  {/* Attendance Status Chart */}
                  <div className="mt-4">
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
      </CardContent>
    </Card>
  );
}

function StatCard({ 
  title, 
  value, 
  unit
}: { 
  title: string; 
  value: number | string; 
  unit?: string;
}) {
  return (
    <div className="bg-muted/30 p-3 rounded-lg">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-xl font-semibold flex items-center gap-1">
        {value} {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}
