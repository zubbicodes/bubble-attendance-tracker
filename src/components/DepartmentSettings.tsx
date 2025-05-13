
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { useAttendance } from '@/contexts/AttendanceContext';
import { Department, DepartmentSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function DepartmentSettingsDialog() {
  const { departmentSettings, setDepartmentSettings } = useAttendance();
  const [tempSettings, setTempSettings] = useState<DepartmentSettings>(departmentSettings);
  const { toast } = useToast();
  
  const handleTimeChange = (dept: Department, type: 'entry' | 'exit', value: string) => {
    setTempSettings(prev => ({
      ...prev,
      [dept]: {
        ...prev[dept],
        [type]: value
      }
    }));
  };
  
  const handleSave = () => {
    setDepartmentSettings(tempSettings);
    toast({
      title: "Settings updated",
      description: "Department time settings have been saved",
    });
  };
  
  const departments: Department[] = ['administration', 'supervisor', 'packing', 'production', 'others'];
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Department Settings</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Department Time Settings</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="grid gap-6">
            <div className="grid grid-cols-3 text-sm font-medium mb-1">
              <div>Department</div>
              <div>Entry Time</div>
              <div>Exit Time</div>
            </div>
            {departments.map((dept) => (
              <div key={dept} className="grid grid-cols-3 gap-4 items-center">
                <div className="capitalize">{dept}</div>
                <div>
                  <Input
                    type="time"
                    value={tempSettings[dept].entry}
                    onChange={(e) => handleTimeChange(dept, 'entry', e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    type="time"
                    value={tempSettings[dept].exit}
                    onChange={(e) => handleTimeChange(dept, 'exit', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button onClick={handleSave}>Save Settings</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
