
import { useState } from 'react';
import { useAttendance } from '@/contexts/AttendanceContext';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { loadAttendanceByDate } from '@/utils/attendanceUtils';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';

export default function DateSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { date, setDate, setAttendanceRecords, setIsLoading: setAppLoading } = useAttendance();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDateChange = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setDate(dateStr);
    setIsOpen(false);
  };

  const loadDataForDate = async (dateStr: string) => {
    setIsLoading(true);
    setAppLoading(true);
    
    try {
      console.log('Loading data for date:', dateStr);
      const records = await loadAttendanceByDate(dateStr);
      console.log('Loaded records:', records);
      
      if (records.length > 0) {
        setAttendanceRecords(records);
        toast({
          title: "Data loaded",
          description: `Loaded ${records.length} attendance records for ${dateStr}`,
        });
      } else {
        setAttendanceRecords([]);
        toast({
          title: "No records found",
          description: `No attendance records found for ${dateStr}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load attendance records from database",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setAppLoading(false);
    }
  };

  const deleteDataForDate = async () => {
    if (!date) return;
    
    setIsLoading(true);
    setAppLoading(true);
    
    try {
      console.log('Deleting data for date:', date);
      
      const { error, count } = await supabase
        .from('daily_attendance')
        .delete({ count: 'exact' })
        .eq('date', date);
        
      if (error) {
        throw error;
      }
      
      setAttendanceRecords([]); // Clear the records from the UI
      
      toast({
        title: "Data deleted",
        description: `Successfully deleted ${count || 0} attendance records for ${date}`,
      });
    } catch (error) {
      console.error('Error deleting data:', error);
      toast({
        title: "Error deleting data",
        description: "Failed to delete attendance records from database",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setAppLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[240px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
            disabled={isLoading}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(new Date(date), 'PP') : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date ? new Date(date) : undefined}
            onSelect={handleDateChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      
      <Button 
        variant="outline"
        size="sm"
        disabled={isLoading || !date} 
        onClick={() => date && loadDataForDate(date)}
      >
        {isLoading ? 'Loading...' : 'Load Data'}
      </Button>
      
      <Button 
        variant="outline"
        size="sm"
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
        disabled={isLoading || !date} 
        onClick={() => setDeleteDialogOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Delete</span>
      </Button>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attendance Data</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all attendance records for {date}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                deleteDataForDate();
              }}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
