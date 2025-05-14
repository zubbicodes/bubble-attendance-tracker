
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAttendance } from '@/contexts/AttendanceContext';
import { Department, DepartmentSettings } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { calculateAttendanceStatus, timeToMinutes } from '@/utils/attendanceUtils';

export default function DepartmentSettingsDialog() {
  const { attendanceRecords, departmentSettings, setDepartmentSettings, setAttendanceRecords } = useAttendance();
  const [tempSettings, setTempSettings] = useState<DepartmentSettings>(departmentSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  // Default times from the image
  const defaultTimes = {
    administration: { entry: "09:15 AM", exit: "05:45 PM" },
    supervisor: { entry: "08:15 AM", exit: "07:45 PM" },
    packing: { entry: "08:15 AM", exit: "07:45 PM" },
    production: { entry: "08:15 AM", exit: "07:45 AM" },
    others: { entry: "08:15 AM", exit: "07:45 AM" }
  };
  
  // Load department settings from Supabase when component mounts
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('department_settings')
          .select('name, starttime, endtime');
          
        if (error) {
          console.error('Error fetching department settings:', error);
          toast({
            title: "Error loading settings",
            description: "Failed to load department settings. Using defaults.",
            variant: "destructive"
          });
          
          // Use the default times from image
          setDepartmentSettings(defaultTimes);
          setTempSettings(defaultTimes);
          return;
        }
        
        if (data && data.length > 0) {
          console.log('Loaded department settings:', data);
          // Convert database format to our app's format
          const settings: DepartmentSettings = { ...defaultTimes };
          
          data.forEach(record => {
            const dept = record.name as Department;
            if (dept in settings) {
              settings[dept] = {
                entry: formatTimeToAMPM(record.starttime),
                exit: formatTimeToAMPM(record.endtime)
              };
            }
          });
          
          setDepartmentSettings(settings);
          setTempSettings(settings);
          
          // Recalculate attendance status for all records with the new settings
          if (attendanceRecords.length > 0) {
            recalculateAttendanceStatus(settings);
          }
        } else {
          // No settings found in DB, use defaults
          setDepartmentSettings(defaultTimes);
          setTempSettings(defaultTimes);
        }
      } catch (error) {
        console.error('Error loading department settings:', error);
        toast({
          title: "Error loading settings",
          description: "Failed to load department settings. Using defaults.",
          variant: "destructive"
        });
        
        // Use the default times from image
        setDepartmentSettings(defaultTimes);
        setTempSettings(defaultTimes);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, []);

  // Convert 24-hour format to AM/PM format
  function formatTimeToAMPM(time24: string): string {
    if (!time24) return "";
    
    // Extract hours and minutes
    const [hours, minutes] = time24.split(':').map(Number);
    
    // Determine AM/PM
    const period = hours >= 12 ? 'PM' : 'AM';
    
    // Convert hours to 12-hour format
    const hours12 = hours % 12 || 12;
    
    // Format as "hh:mm AM/PM"
    return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  }
  
  // Convert AM/PM format to 24-hour format for database
  function formatTimeTo24Hour(timeAMPM: string): string {
    if (!timeAMPM) return "";
    
    const [timePart, period] = timeAMPM.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    
    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  }
  
  const handleTimeChange = (dept: Department, type: 'entry' | 'exit', value: string) => {
    setTempSettings(prev => ({
      ...prev,
      [dept]: {
        ...prev[dept],
        [type]: value
      }
    }));
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Convert settings to database format and save to Supabase
      const departments: Department[] = ['administration', 'supervisor', 'packing', 'production', 'others'];
      
      // Delete existing records first
      await supabase
        .from('department_settings')
        .delete()
        .in('name', departments);
      
      // Insert new records
      const records = departments.map(dept => {
        const entry24 = formatTimeTo24Hour(tempSettings[dept].entry);
        const exit24 = formatTimeTo24Hour(tempSettings[dept].exit);
        
        // Calculate working hours in minutes
        const entryMinutes = timeToMinutes(entry24);
        const exitMinutes = timeToMinutes(exit24);
        
        // Handle case where exit is on the next day (night shift)
        const workinghours = exitMinutes >= entryMinutes 
          ? exitMinutes - entryMinutes 
          : (24 * 60 - entryMinutes) + exitMinutes;
          
        return {
          name: dept,
          starttime: entry24,
          endtime: exit24,
          workinghours: workinghours,
          graceminutes: 15 // Default grace period
        };
      });
      
      const { error } = await supabase
        .from('department_settings')
        .insert(records);
        
      if (error) {
        throw new Error(`Error saving settings: ${error.message}`);
      }
      
      // Update settings in context
      setDepartmentSettings(tempSettings);
      
      // Recalculate attendance status for all records with the new settings
      recalculateAttendanceStatus(tempSettings);
      
      toast({
        title: "Settings updated",
        description: "Department time settings have been saved",
      });
    } catch (error) {
      console.error('Error saving department settings:', error);
      toast({
        title: "Error saving settings",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Recalculate attendance status for all records based on new settings
  const recalculateAttendanceStatus = (settings: DepartmentSettings) => {
    if (attendanceRecords.length === 0) return;
    
    console.log('Recalculating attendance status with settings:', settings);
    
    const updatedRecords = attendanceRecords.map(record => {
      // Recalculate status with the updated settings
      const status = calculateAttendanceStatus(record, settings);
      
      // Recalculate total hours if we have both entry and exit times
      let totalHours = record.totalHours;
      if (record.entryTime && record.exitTime) {
        const entryTime = record.entryTime;
        const exitTime = record.exitTime;
        
        const entryMinutes = timeToMinutes(entryTime);
        const exitMinutes = timeToMinutes(exitTime);
        
        // Calculate total hours
        const diffMinutes = exitMinutes >= entryMinutes 
          ? exitMinutes - entryMinutes 
          : (24 * 60 - entryMinutes) + exitMinutes;
          
        totalHours = parseFloat((diffMinutes / 60).toFixed(2));
      }
      
      return { 
        ...record, 
        status,
        totalHours 
      };
    });
    
    console.log('Updated records after recalculation:', updatedRecords);
    setAttendanceRecords(updatedRecords);
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
          <DialogDescription>
            Configure the standard working hours for each department.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="text-center py-4">Loading department settings...</div>
          ) : (
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
                      type="text"
                      value={tempSettings[dept].entry}
                      onChange={(e) => handleTimeChange(dept, 'entry', e.target.value)}
                      placeholder="09:00 AM"
                    />
                  </div>
                  <div>
                    <Input
                      type="text"
                      value={tempSettings[dept].exit}
                      onChange={(e) => handleTimeChange(dept, 'exit', e.target.value)}
                      placeholder="05:00 PM"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || isLoading}
            className="bg-blue-900 hover:bg-blue-800"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
