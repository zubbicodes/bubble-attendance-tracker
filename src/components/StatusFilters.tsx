
import { AttendanceStatus } from '@/types';
import { useAttendance } from '@/contexts/AttendanceContext';
import { getStatusColor } from '@/utils/attendanceUtils';

const statusLabels: Record<AttendanceStatus, { label: string }> = {
  onTime: { label: 'On Time' },
  lateEntry: { label: 'Late Entry' },
  earlyExit: { label: 'Early Exit' },
  missingCheckout: { label: 'Missing Checkout' },
  lessHours: { label: 'Less Working Hours' }
};

export default function StatusFilters() {
  const { attendanceRecords, selectedStatus, setSelectedStatus } = useAttendance();

  // Count attendances by status
  const statusCounts = attendanceRecords.reduce((counts, record) => {
    counts[record.status] = (counts[record.status] || 0) + 1;
    return counts;
  }, {} as Record<AttendanceStatus, number>);

  const handleStatusClick = (status: AttendanceStatus) => {
    setSelectedStatus(selectedStatus === status ? null : status);
  };

  return (
    <div className="mb-6">
      <h2 className="text-lg font-medium mb-3">Attendance Status</h2>
      <div className="flex flex-wrap gap-3">
        {Object.entries(statusLabels).map(([status, { label }]) => {
          const count = statusCounts[status as AttendanceStatus] || 0;
          const isSelected = selectedStatus === status;
          
          return (
            <button
              key={status}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full 
                ${getStatusColor(status as AttendanceStatus)} 
                ${isSelected ? 'ring-2 ring-offset-2 ring-primary' : ''}
                transition-all duration-200 hover:scale-105 hover:shadow-md
              `}
              onClick={() => handleStatusClick(status as AttendanceStatus)}
              disabled={count === 0}
            >
              <span className="font-medium">{label}</span>
              <span className="ml-1 bg-white bg-opacity-25 px-2 py-0.5 rounded-full text-sm">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
