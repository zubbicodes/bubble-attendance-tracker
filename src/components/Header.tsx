
import { useAttendance } from '@/contexts/AttendanceContext';
import DateSelector from './DateSelector';
import SaveToSupabase from './SaveToSupabase';

export default function Header() {
  const { attendanceRecords } = useAttendance();
  
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Upload, manage, and export attendance data
          </p>
        </div>
        
        <div className="flex gap-3">
          {attendanceRecords.length > 0 && <SaveToSupabase />}
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <DateSelector />
      </div>
    </div>
  );
}
