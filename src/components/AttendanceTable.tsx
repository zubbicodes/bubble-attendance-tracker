
import React, { useState, useMemo } from 'react';
import { EmployeeAttendance, AttendanceStatus, Department } from '@/types';
import { useAttendance } from '@/contexts/AttendanceContext';
import { getStatusIcon, getStatusColor } from '@/utils/attendanceUtils';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { isFemaleStaff } from '@/utils/departmentUtils';

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

  // Group records by department
  const recordsByDepartment = useMemo(() => {
    const departments: Record<Department, EmployeeAttendance[]> = {
      'administration': [],
      'supervisor': [],
      'packing': [],
      'production': [],
      'others': []
    };
    
    sortedRecords.forEach(record => {
      departments[record.department].push(record);
    });
    
    return departments;
  }, [sortedRecords]);

  const handleSort = (key: keyof EmployeeAttendance) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleRowClick = (employee: EmployeeAttendance) => {
    setSelectedEmployee(employee);
  };

  // Department display names (capitalized)
  const departmentDisplayNames: Record<Department, string> = {
    'administration': 'Administration',
    'supervisor': 'Supervisor',
    'packing': 'Packing',
    'production': 'Production',
    'others': 'Others'
  };

  // Department display order
  const departmentOrder: Department[] = ['administration', 'supervisor', 'packing', 'production', 'others'];

  return (
    <div className="w-full">
      <div className="mb-4">
        <Input
          placeholder="Search by name or department..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <div className="mt-2 text-sm text-muted-foreground">
          Showing {sortedRecords.length} of {attendanceRecords.length} records
        </div>
      </div>

      <div className="space-y-8">
        {departmentOrder.map(dept => {
          const employees = recordsByDepartment[dept];
          if (employees.length === 0) return null;
          
          return (
            <Card key={dept} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-muted/30 p-3 border-b font-medium">
                  {departmentDisplayNames[dept]} ({employees.length})
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">Sr.</th>
                        <th 
                          className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted/80"
                          onClick={() => handleSort('name')}
                        >
                          Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
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
                      {employees.map((record, index) => (
                        <tr 
                          key={record.id} 
                          className="hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => handleRowClick(record)}
                        >
                          <td className="px-4 py-2 text-sm">{index + 1}</td>
                          <td className="px-4 py-2 text-sm font-medium">
                            {record.name}
                            {isFemaleStaff(record.name) && (
                              <span className="ml-1 text-xs font-semibold text-pink-500 bg-pink-50 rounded-full px-1.5">F</span>
                            )}
                          </td>
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
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {sortedRecords.length === 0 && (
        <div className="p-8 text-center text-muted-foreground border rounded-lg">
          No attendance records found
        </div>
      )}
    </div>
  );
}
