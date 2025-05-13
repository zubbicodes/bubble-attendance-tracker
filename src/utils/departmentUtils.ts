
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

export const defaultDepartmentSettings = {
  administration: { entry: "09:00", exit: "17:00" },
  supervisor: { entry: "08:00", exit: "16:00" },
  packing: { entry: "08:30", exit: "16:30" },
  production: { entry: "07:00", exit: "15:00" },
  others: { entry: "09:00", exit: "17:00" }
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
