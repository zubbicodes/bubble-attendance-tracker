
import { useAttendance } from '@/contexts/AttendanceContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import EmployeeStats from './EmployeeStats';
import { getExpectedWorkHours, isFemaleStaff } from '@/utils/departmentUtils';

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
          {selectedEmployee && (
            <SheetDescription>
              {selectedEmployee.name}
              {isFemaleStaff(selectedEmployee.name) && (
                <span className="ml-1 text-xs font-semibold text-pink-500 bg-pink-50 rounded-full px-1.5">F</span>
              )}
              <span className="ml-2 text-sm text-muted-foreground">
                {selectedEmployee.department} Department • 
                {isFemaleStaff(selectedEmployee.name) 
                  ? " 10 hours duty (8am-6pm)"
                  : selectedEmployee.department === 'administration' 
                    ? " 9 hours duty (9am-6pm)" 
                    : " 12 hours duty (8am-8pm)"}
              </span>
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="mt-6">
          <EmployeeStats inPanel={true} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
