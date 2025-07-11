import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAttendance } from '@/contexts/AttendanceContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { FileText, File, Image } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { getProductionDetails, getSubDepartmentDisplayName, getCategoryDisplayName } from '@/utils/departmentUtils';
import { ProductionSubDepartment, EmployeeCategory } from '@/types';

export default function ExportOptions() {
  const { attendanceRecords, date } = useAttendance();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportToExcel = () => {
    if (attendanceRecords.length === 0) {
      toast({
        title: "No data to export",
        description: "Please upload attendance data first.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      // Format data for Excel
      const excelData = attendanceRecords.map((record, index) => ({
        'Sr.': index + 1,
        'Name': record.name,
        'Department': record.department,
        'Entry Time': record.entryTime || '-',
        'Exit Time': record.exitTime || '-',
        'Working Hours': record.totalHours.toFixed(1),
        'Status': record.status,
      }));

      // Create workbook
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

      // Generate file name
      const fileName = `ADSONS_Attendance_${date}.xlsx`;

      // Export
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Excel Export Successful",
        description: `Data has been exported to ${fileName}`,
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting to Excel",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportToPDF = () => {
    if (attendanceRecords.length === 0) {
      toast({
        title: "No data to export",
        description: "Please upload attendance data first.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      // Format date for display
      const displayDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Create new PDF document
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(18);
      doc.text('ADSONS Attendance Report', 14, 20);
      
      // Add date
      doc.setFontSize(12);
      doc.text(`Date: ${displayDate}`, 14, 30);

      // Group records by department
      const departments = ['administration', 'supervisor', 'packing', 'production', 'others'];
      let yPos = 40;

      departments.forEach(dept => {
        const deptRecords = attendanceRecords.filter(r => r.department === dept);
        if (deptRecords.length === 0) return;

        // Department heading
        yPos += 10;
        doc.setFontSize(14);
        doc.text(`${dept.charAt(0).toUpperCase() + dept.slice(1)} (${deptRecords.length})`, 14, yPos);
        yPos += 10;

        if (dept === 'production') {
          // Handle production department with sub-departments
          const productionSubDepts: ProductionSubDepartment[] = ['crochet', 'needle', 'cord'];
          const categories: EmployeeCategory[] = ['master', 'operator'];

          productionSubDepts.forEach(subDept => {
            let hasRecords = false;
            categories.forEach(category => {
              const records = deptRecords.filter(r => {
                const { subDepartment, category: empCategory } = getProductionDetails(r.name);
                return subDepartment === subDept && empCategory === category;
              });

              if (records.length > 0) {
                if (!hasRecords) {
                  // Sub-department heading
                  yPos += 5;
                  doc.setFontSize(12);
                  doc.text(`${getSubDepartmentDisplayName(subDept)}`, 20, yPos);
                  yPos += 5;
                  hasRecords = true;
                }

                // Category heading
                doc.setFontSize(11);
                doc.text(`${getCategoryDisplayName(category)}s`, 25, yPos);
                yPos += 5;

                // Create table for this category
                const columns = ['Sr.', 'Name', 'Entry', 'Exit', 'Hours', 'Status'];
                const columnWidths = [10, 60, 25, 25, 20, 40];
                const startX = 25;
                let currentX = startX;
                
                // Draw header
                doc.setFillColor(75, 85, 99);
                doc.setDrawColor(75, 85, 99);
                doc.setTextColor(255, 255, 255);
                doc.rect(startX, yPos, 160, 8, 'F');
                
                columns.forEach((col, i) => {
                  doc.text(col, currentX + 2, yPos + 6);
                  currentX += columnWidths[i];
                });
                
                yPos += 8;
                
                // Draw rows
                doc.setTextColor(0, 0, 0);
                records.forEach((record, index) => {
                  currentX = startX;
                  const rowData = [
                    (index + 1).toString(),
                    record.name,
                    record.entryTime || '-',
                    record.exitTime || '-',
                    record.totalHours.toFixed(1),
                    record.status
                  ];
                  
                  doc.setDrawColor(220, 220, 220);
                  doc.setFillColor(index % 2 === 0 ? 245 : 255, index % 2 === 0 ? 245 : 255, index % 2 === 0 ? 245 : 255);
                  doc.rect(startX, yPos, 160, 8, 'F');
                  doc.setDrawColor(200, 200, 200);
                  doc.rect(startX, yPos, 160, 8, 'D');
                  
                  rowData.forEach((cell, i) => {
                    doc.text(cell.toString(), currentX + 2, yPos + 6);
                    currentX += columnWidths[i];
                  });
                  
                  yPos += 8;
                  
                  // Add a new page if we're running out of space
                  if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                  }
                });
                
                yPos += 5;
              }
            });
          });
        } else {
          // Create simple table for other departments
          const columns = ['Sr.', 'Name', 'Entry', 'Exit', 'Hours', 'Status'];
          const columnWidths = [10, 60, 25, 25, 20, 40];
          const startX = 14;
          let currentX = startX;
          
          // Draw header
          doc.setFillColor(75, 85, 99);
          doc.setDrawColor(75, 85, 99);
          doc.setTextColor(255, 255, 255);
          doc.rect(startX, yPos, 180, 8, 'F');
          
          columns.forEach((col, i) => {
            doc.text(col, currentX + 2, yPos + 6);
            currentX += columnWidths[i];
          });
          
          yPos += 8;
          
          // Draw rows
          doc.setTextColor(0, 0, 0);
          deptRecords.forEach((record, index) => {
            currentX = startX;
            const rowData = [
              (index + 1).toString(),
              record.name,
              record.entryTime || '-',
              record.exitTime || '-',
              record.totalHours.toFixed(1),
              record.status
            ];
            
            doc.setDrawColor(220, 220, 220);
            doc.setFillColor(index % 2 === 0 ? 245 : 255, index % 2 === 0 ? 245 : 255, index % 2 === 0 ? 245 : 255);
            doc.rect(startX, yPos, 180, 8, 'F');
            doc.setDrawColor(200, 200, 200);
            doc.rect(startX, yPos, 180, 8, 'D');
            
            rowData.forEach((cell, i) => {
              doc.text(cell.toString(), currentX + 2, yPos + 6);
              currentX += columnWidths[i];
            });
            
            yPos += 8;
            
            // Add a new page if we're running out of space
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
          });
        }
        
        yPos += 10;
      });

      // Generate file name and save
      const fileName = `ADSONS_Attendance_${date}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF Export Successful",
        description: `Data has been exported to ${fileName}`,
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "An error occurred while exporting to PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportToPNG = () => {
    if (attendanceRecords.length === 0) {
      toast({
        title: "No data to export",
        description: "Please upload attendance data first.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      // Find the table element to capture
      const tableContainer = document.querySelector('.attendance-table-container');
      
      if (!tableContainer) {
        throw new Error('Table element not found');
      }

      // Use html2canvas to capture the table as an image
      import('html2canvas').then(html2canvasModule => {
        const html2canvas = html2canvasModule.default;
        
        html2canvas(tableContainer as HTMLElement).then(canvas => {
          // Convert canvas to PNG data URL
          const imageData = canvas.toDataURL('image/png');
          
          // Create a download link
          const link = document.createElement('a');
          link.href = imageData;
          link.download = `ADSONS_Attendance_${date}.png`;
          link.click();
          
          toast({
            title: "PNG Export Successful",
            description: `Table has been exported as a PNG image`,
          });
          
          setIsExporting(false);
        });
      }).catch(error => {
        console.error('Error loading html2canvas:', error);
        throw new Error('Failed to load export library');
      });
    } catch (error) {
      console.error('Error exporting to PNG:', error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting to PNG",
        variant: "destructive",
      });
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={attendanceRecords.length === 0 || isExporting}>
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportToExcel}>
          <FileText className="mr-2 h-4 w-4" /> Export to Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportToPDF}>
          <File className="mr-2 h-4 w-4" /> Export to PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportToPNG}>
          <Image className="mr-2 h-4 w-4" /> Export to PNG
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
