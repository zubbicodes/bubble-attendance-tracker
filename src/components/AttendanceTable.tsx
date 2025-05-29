import React, { useState, useMemo } from 'react';
import { EmployeeAttendance, AttendanceStatus, Department, ProductionSubDepartment, EmployeeCategory } from '@/types';
import { useAttendance } from '@/contexts/AttendanceContext';
import { getStatusIcon, getStatusColor, calculateTotalHours, calculateAttendanceStatus } from '@/utils/attendanceUtils';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { isFemaleStaff, getProductionDetails, getSubDepartmentDisplayName, getCategoryDisplayName } from '@/utils/departmentUtils';
import { Button } from '@/components/ui/button';
import { Check, X, Edit2, BarChart2, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Helper function to format time for input
const formatTimeForInput = (time: string | null): string => {
  if (!time) return '';
  
  // Handle AM/PM format
  if (time.includes('AM') || time.includes('PM')) {
    const [timePart, period] = time.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    
    // Convert to 24-hour format
    if (period === 'PM' && hours < 12) {
      hours += 12;
    }
    if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  // Handle 24-hour format
  return time;
};

// Helper function to format time for display
const formatTimeForDisplay = (time: string): string => {
  if (!time) return '';
  
  const [hours, minutes] = time.split(':').map(Number);
  
  // Convert to 12-hour format
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export default function AttendanceTable() {
  const { attendanceRecords, selectedStatus, setSelectedEmployee, setAttendanceRecords } = useAttendance();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<EmployeeAttendance | null>(null);
  const { toast } = useToast();
  const [sortConfig, setSortConfig] = useState<{ key: keyof EmployeeAttendance; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc'
  });

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

  // Production sub-department order
  const productionSubDeptOrder: ProductionSubDepartment[] = ['crochet', 'needle', 'cord'];
  const categoryOrder: EmployeeCategory[] = ['master', 'operator'];

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

  // Group records by department and sub-department
  const recordsByDepartment = useMemo(() => {
    const departments: Record<Department, any> = {
      'administration': [],
      'supervisor': [],
      'packing': [],
      'production': {
        crochet: { master: [], operator: [] },
        needle: { master: [], operator: [] },
        cord: { master: [], operator: [] }
      },
      'others': []
    };
    
    sortedRecords.forEach(record => {
      if (record.department === 'production') {
        const { subDepartment, category } = getProductionDetails(record.name);
        if (subDepartment && category) {
          departments.production[subDepartment][category].push(record);
        } else {
          departments.others.push(record);
        }
      } else {
        departments[record.department].push(record);
      }
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

  const handleEdit = (record: EmployeeAttendance) => {
    setEditingRow(record.id);
    setEditedData({
      ...record,
      entryTime: formatTimeForInput(record.entryTime),
      exitTime: formatTimeForInput(record.exitTime)
    });
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditedData(null);
  };

  const handleSave = async (record: EmployeeAttendance) => {
    if (!editedData) return;

    try {
      const entryTimeDisplay = formatTimeForDisplay(editedData.entryTime || '');
      const exitTimeDisplay = formatTimeForDisplay(editedData.exitTime || '');
      
      // Update the database
      const { error } = await supabase
        .from('daily_attendance')
        .update({
          in_time: entryTimeDisplay,
          out_time: exitTimeDisplay,
          total_minutes: Math.round(editedData.totalHours * 60),
          status: [editedData.status],
          working_hours: `${editedData.totalHours.toFixed(1)}h`,
        })
        .eq('id', record.id);

      if (error) throw error;

      // Update local state with formatted times
      const updatedRecord = {
        ...editedData,
        entryTime: entryTimeDisplay,
        exitTime: exitTimeDisplay
      };

      setAttendanceRecords(prevRecords =>
        prevRecords.map(r => (r.id === record.id ? updatedRecord : r))
      );

      setEditingRow(null);
      setEditedData(null);

      toast({
        title: "Success",
        description: "Attendance record updated successfully.",
      });
    } catch (error) {
      console.error('Error updating record:', error);
      toast({
        title: "Error",
        description: "Failed to update attendance record.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: keyof EmployeeAttendance, value: string) => {
    if (!editedData) return;

    const updatedData = { ...editedData };
    
    if (field === 'entryTime' || field === 'exitTime') {
      updatedData[field] = value;
      // Recalculate total hours and status
      if (updatedData.entryTime && updatedData.exitTime) {
        const entryTimeDisplay = formatTimeForDisplay(updatedData.entryTime);
        const exitTimeDisplay = formatTimeForDisplay(updatedData.exitTime);
        updatedData.totalHours = calculateTotalHours(entryTimeDisplay, exitTimeDisplay);
        updatedData.status = calculateAttendanceStatus({
          ...updatedData,
          entryTime: entryTimeDisplay,
          exitTime: exitTimeDisplay
        });
      }
    }

    setEditedData(updatedData);
  };

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

      <div className="space-y-4">
        {departmentOrder.map(dept => {
          if (dept === 'production') {
            return (
              <Card key={dept}>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">{departmentDisplayNames[dept]}</h3>
                  {productionSubDeptOrder.map(subDept => {
                    const hasRecords = categoryOrder.some(category => 
                      recordsByDepartment.production[subDept][category].length > 0
                    );
                    
                    if (!hasRecords) return null;

                    const sectionId = `production-${subDept}`;
                    const isExpanded = true; // Always expanded

                    return (
                      <div key={subDept} className="mb-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                          <ChevronDown className="h-4 w-4" />
                          {getSubDepartmentDisplayName(subDept)}
                        </div>
                        
                        {categoryOrder.map(category => {
                          const records = recordsByDepartment.production[subDept][category];
                          if (records.length === 0) return null;

                          return (
                            <div key={`${subDept}-${category}`} className="ml-6 mb-4">
                              <h4 className="text-sm font-medium mb-2">{getCategoryDisplayName(category)}s</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">#</th>
                                      <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Name</th>
                                      <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Entry Time</th>
                                      <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Exit Time</th>
                                      <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Total Hours</th>
                                      <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Status</th>
                                      <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {records.map((record, index) => (
                                      <tr 
                                        key={record.id} 
                                        className="hover:bg-muted/30 transition-colors"
                                      >
                                        <td className="px-4 py-2 text-sm">{index + 1}</td>
                                        <td className="px-4 py-2 text-sm font-medium">
                                          {record.name}
                                          {isFemaleStaff(record.name) && (
                                            <span className="ml-1 text-xs font-semibold text-pink-500 bg-pink-50 rounded-full px-1.5">F</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-2 text-sm">
                                          {editingRow === record.id ? (
                                            <Input
                                              type="time"
                                              value={editedData?.entryTime || ''}
                                              onChange={(e) => handleInputChange('entryTime', e.target.value)}
                                              className="w-32"
                                            />
                                          ) : (
                                            record.entryTime || '-'
                                          )}
                                        </td>
                                        <td className="px-4 py-2 text-sm">
                                          {editingRow === record.id ? (
                                            <Input
                                              type="time"
                                              value={editedData?.exitTime || ''}
                                              onChange={(e) => handleInputChange('exitTime', e.target.value)}
                                              className="w-32"
                                            />
                                          ) : (
                                            record.exitTime || '-'
                                          )}
                                        </td>
                                        <td className="px-4 py-2 text-sm">
                                          {editingRow === record.id ? editedData?.totalHours.toFixed(1) : record.totalHours.toFixed(1)}
                                        </td>
                                        <td className="px-4 py-2 text-sm">
                                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${getStatusColor(editingRow === record.id ? editedData?.status || record.status : record.status)} text-xs`}>
                                            {getStatusIcon(editingRow === record.id ? editedData?.status || record.status : record.status)} 
                                            {editingRow === record.id ? editedData?.status || record.status : record.status}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 text-sm">
                                          {editingRow === record.id ? (
                                            <div className="flex gap-2">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSave(record)}
                                                className="h-8 w-8 p-0"
                                              >
                                                <Check className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleCancel}
                                                className="h-8 w-8 p-0"
                                              >
                                                <X className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          ) : (
                                            <div className="flex gap-2">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(record)}
                                                className="h-8 w-8 p-0"
                                              >
                                                <Edit2 className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRowClick(record)}
                                                className="h-8 w-8 p-0"
                                              >
                                                <BarChart2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          }

          const employees = recordsByDepartment[dept];
          if (employees.length === 0) return null;

          return (
            <Card key={dept}>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">{departmentDisplayNames[dept]}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">#</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Name</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Entry Time</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Exit Time</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Total Hours</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {employees.map((record, index) => (
                        <tr 
                          key={record.id} 
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-2 text-sm">{index + 1}</td>
                          <td className="px-4 py-2 text-sm font-medium">
                            {record.name}
                            {isFemaleStaff(record.name) && (
                              <span className="ml-1 text-xs font-semibold text-pink-500 bg-pink-50 rounded-full px-1.5">F</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {editingRow === record.id ? (
                              <Input
                                type="time"
                                value={editedData?.entryTime || ''}
                                onChange={(e) => handleInputChange('entryTime', e.target.value)}
                                className="w-32"
                              />
                            ) : (
                              record.entryTime || '-'
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {editingRow === record.id ? (
                              <Input
                                type="time"
                                value={editedData?.exitTime || ''}
                                onChange={(e) => handleInputChange('exitTime', e.target.value)}
                                className="w-32"
                              />
                            ) : (
                              record.exitTime || '-'
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {editingRow === record.id ? editedData?.totalHours.toFixed(1) : record.totalHours.toFixed(1)}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${getStatusColor(editingRow === record.id ? editedData?.status || record.status : record.status)} text-xs`}>
                              {getStatusIcon(editingRow === record.id ? editedData?.status || record.status : record.status)} 
                              {editingRow === record.id ? editedData?.status || record.status : record.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {editingRow === record.id ? (
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSave(record)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleCancel}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(record)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRowClick(record)}
                                  className="h-8 w-8 p-0"
                                >
                                  <BarChart2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
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
