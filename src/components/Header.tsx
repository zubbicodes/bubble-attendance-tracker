
import { useAttendance } from '@/contexts/AttendanceContext';
import DepartmentSettings from './DepartmentSettings';
import SaveToSupabase from './SaveToSupabase';

export default function Header() {
  const { date, attendanceRecords } = useAttendance();
  
  const formattedDate = date ? new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '';

  return (
    <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <div>
        <h1 className="text-2xl font-bold">ADSONS Attendance Manager</h1>
        {formattedDate && (
          <p className="text-muted-foreground mt-1">
            {formattedDate} • {attendanceRecords.length} Employees
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <DepartmentSettings />
        <SaveToSupabase />
      </div>
    </div>
  );
}
