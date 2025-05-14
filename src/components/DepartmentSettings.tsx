
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
} from '@/components/ui/dialog';
import { useAttendance } from '@/contexts/AttendanceContext';
import { Department, DepartmentSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { calculateAttendanceStatus } from '@/utils/attendanceUtils';

export default function DepartmentSettingsDialog() {
  const { attendanceRecords, departmentSettings, setDepartmentSettings, setAttendanceRecords } = useAttendance();
  const [tempSettings, setTempSettings] = useState<DepartmentSettings>(departmentSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
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
          return;
        }
        
        if (data && data.length > 0) {
          console.log('Loaded department settings:', data);
          // Convert database format to our app's format
          const settings: DepartmentSettings = { ...departmentSettings };
          
          data.forEach(record => {
            const dept = record.name as Department;
            if (dept in settings) {
              settings[dept] = {
                entry: record.starttime,
                exit: record.endtime
              };
            }
          });
          
          setDepartmentSettings(settings);
          setTempSettings(settings);
          
          // Recalculate attendance status for all records with the new settings
          if (attendanceRecords.length > 0) {
            recalculateAttendanceStatus(settings);
          }
        }
      } catch (error) {
        console.error('Error loading department settings:', error);
        toast({
          title: "Error loading settings",
          description: "Failed to load department settings. Using defaults.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
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
      const records = departments.map(dept => ({
        name: dept,
        starttime: tempSettings[dept].entry,
        endtime: tempSettings[dept].exit,
        workinghours: calculateWorkingHours(tempSettings[dept].entry, tempSettings[dept].exit),
        graceminutes: 15 // Default grace period
      }));
      
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
      const status = calculateAttendanceStatus(record, settings);
      let totalHours = record.totalHours;
      
      // Recalculate total hours if we have both entry and exit times
      if (record.entryTime && record.exitTime) {
        totalHours = calculateWorkingHours(record.entryTime, record.exitTime) / 60;
      }
      
      return { 
        ...record, 
        status,
        totalHours 
      };
    });
    
    setAttendanceRecords(updatedRecords);
  };
  
  // Helper function to calculate working hours in minutes
  const calculateWorkingHours = (entry: string, exit: string): number => {
    const [entryHours, entryMinutes] = entry.split(':').map(Number);
    const [exitHours, exitMinutes] = exit.split(':').map(Number);
    
    const entryTotalMinutes = entryHours * 60 + entryMinutes;
    const exitTotalMinutes = exitHours * 60 + exitMinutes;
    
    // Handle case where exit is on the next day
    const diffMinutes = exitTotalMinutes >= entryTotalMinutes 
      ? exitTotalMinutes - entryTotalMinutes 
      : (24 * 60 - entryTotalMinutes) + exitTotalMinutes;
      
    return diffMinutes;
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
          )}
        </div>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || isLoading}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
