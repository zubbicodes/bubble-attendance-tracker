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
import { Button } from '@/components/ui/button';
import { downloadExcel } from '@/utils/exportUtils';
import { FileSpreadsheet } from 'lucide-react';

export default function EmployeeStatsPanel() {
  const { selectedEmployee, setSelectedEmployee } = useAttendance();
  
  const isOpen = !!selectedEmployee;
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedEmployee(null);
    }
  };

  const handleExport = async () => {
    if (selectedEmployee) {
      await downloadExcel(selectedEmployee);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="flex flex-row items-center justify-between">
          <div>
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
          </div>
          
          {selectedEmployee && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={handleExport}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Stats
            </Button>
          )}
        </SheetHeader>
        <div className="mt-6">
          <EmployeeStats inPanel={true} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
