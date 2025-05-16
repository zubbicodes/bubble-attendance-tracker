
import { AttendanceProvider } from '@/contexts/AttendanceContext';
import FileUploader from '@/components/FileUploader';
import Header from '@/components/Header';
import StatusFilters from '@/components/StatusFilters';
import AttendanceTable from '@/components/AttendanceTable';
import EmployeeStats from '@/components/EmployeeStats';
import EmployeeStatsPanel from '@/components/EmployeeStatsPanel';
import ExportOptions from '@/components/ExportOptions';
import { Card, CardContent } from '@/components/ui/card';

const Index = () => {
  return (
    <AttendanceProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="container py-8">
          <Header />
          <FileUploader />
          
          <div className="grid gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <StatusFilters />
                  <ExportOptions />
                </div>
                <div className="attendance-table-container">
                  <AttendanceTable />
                </div>
              </CardContent>
            </Card>
            
            {/* Show summary stats on main page */}
            <div className="scroll-mt-8 transition-all duration-500" id="employee-stats-section">
              <EmployeeStats />
            </div>
          </div>
          
          {/* Slide-in panel for detailed stats */}
          <EmployeeStatsPanel />
        </div>
      </div>
    </AttendanceProvider>
  );
};

export default Index;
