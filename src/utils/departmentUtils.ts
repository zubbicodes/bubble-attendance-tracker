import { Department, DepartmentMap } from '@/types';

export const departments: DepartmentMap = {
  administration: [
    'asim ali sabri',
    'mian abdullah',
    'abdul wahab',
    'javed shakoor',
    'faisal aslam',
    'muhammad zaryab',
    'rizwan cheema'
  ],
  supervisor: [
    'shafqat',
    'master mohsin'
  ],
  packing: [
    'iqra bibi',
    'nadia bibi',
    'rukhsana kausar',
    'maryam bibi',
    'mariyam bibi',
    'bilal ali',
    'mujahid ali',
    'asif ali',
    'muhammad usman',
    'sufyan ali',
    'mureed abbas'
  ],
  production: [
    'irfanneedle',
    'noor ali',
    'deedar ali'
  ],
  others: [] // Default department
};

// Define female staff members for special working hours
export const femaleStaff = [
  'mariyam bibi',
  'maryam bibi',
  'rukhsana kausar',
  'iqra bibi'
];

// Update default settings to reflect the correct working hours:
// Administration: 9 hours (9am to 6pm)
// Female staff: 10 hours (8am to 6pm)
// All others: 12 hours (8am to 8pm)
export const defaultDepartmentSettings = {
  administration: { entry: "09:00 AM", exit: "06:00 PM" },
  supervisor: { entry: "08:00 AM", exit: "08:00 PM" },
  packing: { entry: "08:00 AM", exit: "08:00 PM" },
  production: { entry: "08:00 AM", exit: "08:00 PM" },
  others: { entry: "08:00 AM", exit: "08:00 PM" }
};

export function getDepartmentForEmployee(name: string): Department {
  name = name.toLowerCase().trim();
  
  for (const [dept, employees] of Object.entries(departments)) {
    if (employees.some(employee => name.includes(employee.toLowerCase()))) {
      return dept as Department;
    }
  }
  
  return 'others';
}

// Function to check if an employee is female staff
export function isFemaleStaff(name: string): boolean {
  name = name.toLowerCase().trim();
  return femaleStaff.some(staff => name.includes(staff.toLowerCase()));
}

// Get expected working hours for an employee based on department and gender
export function getExpectedWorkHours(name: string, department: Department): number {
  if (department === 'administration') {
    return 9; // 9 hours for administration
  } else if (isFemaleStaff(name)) {
    return 10; // 10 hours for female staff
  } else {
    return 12; // 12 hours for everyone else
  }
}

// Get expected entry/exit times for an employee
export function getExpectedTimes(name: string, department: Department): { entry: string, exit: string } {
  if (department === 'administration') {
    return { entry: "09:00 AM", exit: "06:00 PM" }; // 9am to 6pm
  } else if (isFemaleStaff(name)) {
    return { entry: "08:00 AM", exit: "06:00 PM" }; // 8am to 6pm for female staff
  } else {
    return { entry: "08:00 AM", exit: "08:00 PM" }; // 8am to 8pm for everyone else
  }
}
