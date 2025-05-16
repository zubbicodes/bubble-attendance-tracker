
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
    'rukhsana kusar',
    'maryam bibi',
    'bilal ali',
    'mujahid ali',
    'asif ali',
    'muhammad usman',
    'sufyan ali',
    'mureed abbas'
  ],
  production: [
    'irfanneedle',
    'noor ali'
  ],
  others: [] // Default department
};

// Update default settings to reflect the correct working hours:
// Administration: 9 hours (9am to 6pm)
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
