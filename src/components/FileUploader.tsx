
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { parseExcelFile } from '@/utils/excelParser';
import { useAttendance } from '@/contexts/AttendanceContext';
import { useToast } from '@/hooks/use-toast';

export default function FileUploader() {
  const { setAttendanceRecords, setIsLoading, setDate } = useAttendance();
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) {
      toast({
        title: "Invalid file format",
        description: "Please upload an Excel file (.xls or .xlsx)",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Extract date from filename (assuming format like 12052025.xls)
      const dateMatch = file.name.match(/(\d{2})(\d{2})(\d{4})/);
      if (dateMatch && dateMatch.length === 4) {
        const [_, day, month, year] = dateMatch;
        setDate(`${year}-${month}-${day}`);
      }
      
      // Process the file - with updated code that properly handles night shifts
      const records = await parseExcelFile(file);
      
      console.log('Processed records:', records);
      
      setAttendanceRecords(records);
      toast({
        title: "File processed successfully",
        description: `Loaded ${records.length} attendance records with correct night shift handling`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error processing file",
        description: "An error occurred while processing the Excel file",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'
        } transition-all duration-200 cursor-pointer`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <input
          id="fileInput"
          type="file"
          accept=".xls,.xlsx"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center gap-2">
          <svg className="w-10 h-10 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-lg font-medium">Drag & drop your attendance Excel file here</p>
          <p className="text-sm text-gray-500">or click to browse</p>
          <p className="text-xs text-gray-400 mt-2">Supports .xls and .xlsx files</p>
        </div>
      </div>
    </div>
  );
}
