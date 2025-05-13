
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AttendanceProvider } from '@/contexts/AttendanceContext';
import DepartmentSettings from '@/components/DepartmentSettings';

const Settings = () => {
  return (
    <AttendanceProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="container py-8">
          <h1 className="text-2xl font-bold mb-8">Settings</h1>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Department Time Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Configure the standard working hours for each department. These settings will be used to calculate attendance status.
              </p>
              <DepartmentSettings />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                ADSONS Attendance Manager v1.0.0
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AttendanceProvider>
  );
};

export default Settings;
