
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { useAttendance } from '@/contexts/AttendanceContext';
import { useAuth } from '@/contexts/AuthContext';
import DateSelector from './DateSelector';
import SaveToSupabase from './SaveToSupabase';

export default function Header() {
  const { attendanceRecords } = useAttendance();
  const { logout } = useAuth();
  
  const handleLogout = () => {
    logout();
  };
  
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">ADSONS Attendance Manager</h1>
          <p className="text-muted-foreground">
            Upload, manage, and export attendance data
          </p>
        </div>
        
        <div className="flex gap-2">
          {attendanceRecords.length > 0 && <SaveToSupabase />}
          <Link to="/settings">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <DateSelector />
      </div>
    </div>
  );
}
