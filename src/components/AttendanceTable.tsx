
import React, { useState } from 'react';
import { EmployeeAttendance, AttendanceStatus } from '@/types';
import { useAttendance } from '@/contexts/AttendanceContext';
import { getStatusIcon, getStatusColor } from '@/utils/attendanceUtils';
import { Input } from '@/components/ui/input';

export default function AttendanceTable() {
  const { attendanceRecords, selectedStatus, setSelectedEmployee } = useAttendance();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof EmployeeAttendance; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc'
  });

  // Filter records based on selected status and search query
  const filteredRecords = attendanceRecords.filter(record => {
    const matchesStatus = selectedStatus ? record.status === selectedStatus : true;
    const matchesSearch = searchQuery 
      ? record.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        record.acNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.department.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    return matchesStatus && matchesSearch;
  });

  // Sort records
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (key: keyof EmployeeAttendance) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleRowClick = (employee: EmployeeAttendance) => {
    setSelectedEmployee(employee);
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <Input
          placeholder="Search by name, ID, or department..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <div className="mt-2 text-sm text-muted-foreground">
          Showing {sortedRecords.length} of {attendanceRecords.length} records
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full">
          <thead className="bg-muted/50">
            <tr>
              <th 
                className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted/80"
                onClick={() => handleSort('acNo')}
              >
                AC No. {sortConfig.key === 'acNo' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted/80"
                onClick={() => handleSort('name')}
              >
                Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted/80"
                onClick={() => handleSort('department')}
              >
                Department {sortConfig.key === 'department' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted/80"
                onClick={() => handleSort('entryTime')}
              >
                Entry {sortConfig.key === 'entryTime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted/80"
                onClick={() => handleSort('exitTime')}
              >
                Exit {sortConfig.key === 'exitTime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted/80"
                onClick={() => handleSort('totalHours')}
              >
                Hours {sortConfig.key === 'totalHours' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted/80"
                onClick={() => handleSort('status')}
              >
                Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedRecords.map(record => (
              <tr 
                key={record.id} 
                className="hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => handleRowClick(record)}
              >
                <td className="px-4 py-2 text-sm">{record.acNo}</td>
                <td className="px-4 py-2 text-sm font-medium">{record.name}</td>
                <td className="px-4 py-2 text-sm capitalize">{record.department}</td>
                <td className="px-4 py-2 text-sm">{record.entryTime || '-'}</td>
                <td className="px-4 py-2 text-sm">{record.exitTime || '-'}</td>
                <td className="px-4 py-2 text-sm">{record.totalHours.toFixed(1)}</td>
                <td className="px-4 py-2 text-sm">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${getStatusColor(record.status)} text-xs`}>
                    {getStatusIcon(record.status)} {record.status}
                  </span>
                </td>
              </tr>
            ))}
            {sortedRecords.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No attendance records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
