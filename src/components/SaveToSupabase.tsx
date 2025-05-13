
import { Button } from '@/components/ui/button';
import { useAttendance } from '@/contexts/AttendanceContext';
import { useToast } from '@/components/ui/use-toast';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function SaveToSupabase() {
  const { attendanceRecords, date } = useAttendance();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (attendanceRecords.length === 0) {
      toast({
        title: "No data to save",
        description: "Please upload attendance data first.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Format the data for saving to Supabase
      // Convert totalHours to integer minutes for database storage
      const formattedRecords = attendanceRecords.map(record => ({
        date: date,
        name: record.name,
        ac_no: record.acNo,
        in_time: record.entryTime,
        out_time: record.exitTime,
        // Convert to integer to fix the "invalid input syntax for type integer" error
        total_minutes: Math.round(record.totalHours * 60),
        status: [record.status],
        working_hours: `${record.totalHours.toFixed(1)}h`,
      }));

      // First, delete any existing records for this date to avoid duplicates
      const { error: deleteError } = await supabase
        .from('daily_attendance')
        .delete()
        .eq('date', date);

      if (deleteError) {
        throw new Error(`Error clearing existing records: ${deleteError.message}`);
      }

      // Insert the new records
      const { error: insertError } = await supabase
        .from('daily_attendance')
        .insert(formattedRecords);

      if (insertError) {
        throw new Error(`Error saving records: ${insertError.message}`);
      }

      toast({
        title: "Data saved successfully",
        description: `${attendanceRecords.length} attendance records saved for ${date}`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      toast({
        title: "Error saving data",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Button
      onClick={handleSave}
      disabled={attendanceRecords.length === 0 || isSaving}
      className="bg-emerald-600 hover:bg-emerald-700"
    >
      {isSaving ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save to Database</>}
    </Button>
  );
}
