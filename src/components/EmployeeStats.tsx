
import { useAttendance } from '@/contexts/AttendanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Period, StatsMap } from '@/types';
import { calculateEmployeeStats } from '@/utils/attendanceUtils';
import { useState, useEffect } from 'react';

export default function EmployeeStats() {
  const { selectedEmployee, attendanceRecords } = useAttendance();
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

  useEffect(() => {
    if (selectedEmployee && attendanceRecords.length > 0) {
      // Find all attendance records for this employee
      const employeeRecords = attendanceRecords.filter(
        record => record.name === selectedEmployee.name
      );

      // Calculate stats for each period
      setEmployeeStats({
        '7days': calculateEmployeeStats(employeeRecords, 7),
        '30days': calculateEmployeeStats(employeeRecords, 30),
        'allTime': calculateEmployeeStats(employeeRecords)
      });
    }
  }, [selectedEmployee, attendanceRecords]);

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
        <Tabs defaultValue="7days">
          <TabsList className="mb-4">
            <TabsTrigger value="7days">Last 7 Days</TabsTrigger>
            <TabsTrigger value="30days">Last 30 Days</TabsTrigger>
            <TabsTrigger value="allTime">All Time</TabsTrigger>
          </TabsList>

          {(['7days', '30days', 'allTime'] as Period[]).map((period) => (
            <TabsContent key={period} value={period}>
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
                  icon="🕒"
                />
                <StatCard
                  title="Early Exits"
                  value={employeeStats[period].earlyExits}
                  icon="🚪"
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function StatCard({ 
  title, 
  value, 
  unit, 
  icon 
}: { 
  title: string; 
  value: number | string; 
  unit?: string;
  icon?: string;
}) {
  return (
    <div className="bg-muted/30 p-3 rounded-lg">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-xl font-semibold flex items-center gap-1">
        {icon && <span>{icon}</span>}
        {value} {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}
