
import { useAttendance } from '@/contexts/AttendanceContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import EmployeeStats from './EmployeeStats';

export default function EmployeeStatsPanel() {
  const { selectedEmployee, setSelectedEmployee } = useAttendance();
  
  const isOpen = !!selectedEmployee;
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedEmployee(null);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Employee Statistics</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <EmployeeStats inPanel={true} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
