import { Department, DepartmentStructure, ProductionSubDepartment, EmployeeCategory } from '@/types';

// Department structure with sub-departments and categories
export const departmentStructure: DepartmentStructure = {
  administration: [
    'asim ali sabri',
    'mian abdullah',
    'abdul wahab',
    'javed shakoor',
    'faisal aslam',
    'muhammad zaryab',
    'rizwan cheema',
    'usama ijaz',
    'muhammad hamza',
    'irfan cheema',
    'shahzad ali'
  ],
  supervisor: [
    'shafqat',
   
  ],
  packing: [
    'iqra bibi',
    'nadia bibi',
    'rukhsana kausar',
    'Mariyam',
    'mujahid ali',
    'asif ali',
    'muhammad usman',
    'sufyan ali',
    'mureed abbas',
    'nadia bibi',
    'ruqaiya kabir',
    'muqadas bibi'
  ],
  production: {
    crochet: {
      master: [
         'master mohsin',
         'sajid ali',
      ],
      operator: [
        'noor ali',
        'shahzaib shah',
        'sohaib shah',
        'muhammad saif',
        'muhammad ramzan',
        'zeeshan ali',
        
      ]
    },
    needle: {
      master: [
        'deedar ali',
      ],
      operator: [  
        'irfan khokhar',
        'bilal ali',
        'muhammad nadeem',
        'mohsin abid',
        'muhammad naveed',
        'usman arif',
      ]
    },
    cord: {
      master: [
        
      ],
      operator: [
        'zain ali',
        'tanveer maseeh',
      ]
    }
  },
  others: [] // Default department
};

// Define female staff members for special working hours
export const femaleStaff = [
  'Mariyam',
  'nadia bibi',
  'rukhsana kausar',
  'iqra bibi',
  'ruqaiya kabir',
  'muqadas bibi'
];

// Update default settings to reflect the correct working hours:
// Administration: 9 hours (9am to 6pm)
// Female staff: 10 hours (8am to 6pm)
// All others: 12 hours (8am to 8pm)
export const defaultDepartmentSettings = {
  administration: { entry: "10:00 AM", exit: "07:00 PM" },
  supervisor: { entry: "08:00 AM", exit: "08:00 PM" },
  packing: { entry: "08:00 AM", exit: "08:00 PM" },
  production: { entry: "08:00 AM", exit: "08:00 PM" },
  others: { entry: "08:00 AM", exit: "08:00 PM" }
};

// Helper function to get department for an employee
export function getDepartmentForEmployee(name: string): Department {
  const normalizedName = name.toLowerCase();
  
  // Check main departments first
  for (const [dept, employees] of Object.entries(departmentStructure)) {
    if (dept !== 'production' && employees.some(emp => emp.toLowerCase() === normalizedName)) {
      return dept as Department;
    }
  }
  
  // Check production sub-departments
  if (departmentStructure.production) {
    for (const subDept of Object.values(departmentStructure.production)) {
      if (subDept.master.some(emp => emp.toLowerCase() === normalizedName) || 
          subDept.operator.some(emp => emp.toLowerCase() === normalizedName)) {
        return 'production';
      }
    }
  }
  
  return 'others';
}

// Helper function to get sub-department and category for production employees
export function getProductionDetails(name: string): { subDepartment: ProductionSubDepartment | null; category: EmployeeCategory | null } {
  const normalizedName = name.toLowerCase();
  
  if (departmentStructure.production) {
    for (const [subDept, categories] of Object.entries(departmentStructure.production)) {
      if (categories.master.some(emp => emp.toLowerCase() === normalizedName)) {
        return { subDepartment: subDept as ProductionSubDepartment, category: 'master' };
      }
      if (categories.operator.some(emp => emp.toLowerCase() === normalizedName)) {
        return { subDepartment: subDept as ProductionSubDepartment, category: 'operator' };
      }
    }
  }
  
  return { subDepartment: null, category: null };
}

// Helper function to check if employee is female staff
export function isFemaleStaff(name: string): boolean {
  return femaleStaff.some(emp => emp.toLowerCase() === name.toLowerCase());
}

// Helper function to get display name for sub-department
export function getSubDepartmentDisplayName(subDept: ProductionSubDepartment): string {
  const displayNames: Record<ProductionSubDepartment, string> = {
    crochet: 'Crochet Machines',
    needle: 'Needle Machines',
    cord: 'Cord Machines'
  };
  return displayNames[subDept] || subDept;
}

// Helper function to get display name for category
export function getCategoryDisplayName(category: EmployeeCategory): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// Get expected working hours for an employee based on department and gender
export function getExpectedWorkHours(name: string, department: Department): number {
  if (department === 'administration') {
    return 9; // 9 hours for administration (10 AM to 7 PM)
  } else if (isFemaleStaff(name)) {
    return 10; // 10 hours for female staff
  } else {
    return 12; // 12 hours for everyone else
  }
}

// Get expected entry/exit times for an employee
export function getExpectedTimes(name: string, department: Department): { entry: string, exit: string } {
  if (department === 'administration') {
    return { entry: "10:00 AM", exit: "07:00 PM" }; // 10 AM to 7 PM
  } else if (isFemaleStaff(name)) {
    return { entry: "08:00 AM", exit: "06:00 PM" }; // 8 AM to 6 PM for female staff
  } else {
    return { entry: "08:00 AM", exit: "08:00 PM" }; // 8 AM to 8 PM for everyone else
  }
}
