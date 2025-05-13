
import { useState } from 'react';
import { useAttendance } from '@/contexts/AttendanceContext';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { loadAttendanceByDate } from '@/utils/attendanceUtils';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function DateSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { date, setDate, setAttendanceRecords, setIsLoading: setAppLoading } = useAttendance();
  const { toast } = useToast();

  const handleDateChange = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setDate(dateStr);
    setIsOpen(false);
    loadDataForDate(dateStr);
  };

  const loadDataForDate = async (dateStr: string) => {
    setIsLoading(true);
    setAppLoading(true);
    
    try {
      const records = await loadAttendanceByDate(dateStr);
      
      if (records.length > 0) {
        setAttendanceRecords(records);
        toast({
          title: "Data loaded",
          description: `Loaded ${records.length} attendance records for ${dateStr}`,
        });
      } else {
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
        disabled={isLoading} 
        onClick={() => date && loadDataForDate(date)}
      >
        {isLoading ? 'Loading...' : 'Load Data'}
      </Button>
    </div>
  );
}
