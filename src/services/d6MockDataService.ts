// 🎭 D6 Mock Data Service - Simulating D6 API Responses for Testing
import { logger } from '../utils/logger.js';

export interface MockD6ClientIntegration {
  school_login_id?: string;
  school_id?: number;
  school_name: string;
  admin_email_address: string;
  telephone_calling_code: string;
  telephone_number: string;
  api_type_id: number;
  api_type: string;
  activated_by_integrator: string;
}

export interface MockD6Learner {
  learner_id: number;
  first_name: string;
  last_name: string;
  gender: string;
  grade: string;
  debtor_code?: string;
  parent1_id?: number;
  parent2_id?: number;
  accountable_person_id?: number;
  date_of_birth?: string;
  home_language?: string;
  contact_details?: {
    email?: string;
    phone?: string;
    address?: string;
  };
}

export interface MockD6Staff {
  staff_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  subjects?: string[];
  grades?: string[];
}

export interface MockD6Parent {
  parent_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  relationship: string;
  learner_ids: number[];
}

export interface MockD6Mark {
  mark_id: number;
  learner_id: number;
  subject_code: string;
  subject_name: string;
  term: number;
  year: number;
  mark_value: number;
  mark_type: string;
  assessment_date: string;
}

export class D6MockDataService {
  private static instance: D6MockDataService;
  
  // Mock school data
  private mockSchools: MockD6ClientIntegration[] = [
    {
      school_login_id: "1001",
      school_id: 1001,
      school_name: "Greenwood Primary School",
      admin_email_address: "admin@greenwood.school.za",
      telephone_calling_code: "27",
      telephone_number: "0123456789",
      api_type_id: 8,
      api_type: "Admin+ API",
      activated_by_integrator: "Yes"
    },
    {
      school_login_id: "1002", 
      school_id: 1002,
      school_name: "Riverside High School",
      admin_email_address: "principal@riverside.edu.za",
      telephone_calling_code: "27",
      telephone_number: "0124567890",
      api_type_id: 9,
      api_type: "Curriculum+ API", 
      activated_by_integrator: "Yes"
    },
    {
      school_login_id: "1003",
      school_id: 1003,
      school_name: "Sunnydale Academy",
      admin_email_address: "office@sunnydale.co.za",
      telephone_calling_code: "27", 
      telephone_number: "0125678901",
      api_type_id: 10,
      api_type: "Finance+ API",
      activated_by_integrator: "No"
    }
  ];

  // Mock learner data
  private mockLearners: MockD6Learner[] = [
    {
      learner_id: 2001,
      first_name: "Amara",
      last_name: "Ngcobo",
      gender: "F",
      grade: "7",
      debtor_code: "DEB2001",
      parent1_id: 3001,
      parent2_id: 3002,
      accountable_person_id: 3001,
      date_of_birth: "2010-03-15",
      home_language: "Zulu",
      contact_details: {
        email: "amara.ngcobo@student.greenwood.za",
        phone: "0821234567",
        address: "123 Acacia Street, Johannesburg, 2001"
      }
    },
    {
      learner_id: 2002,
      first_name: "Liam",
      last_name: "Van Der Merwe",
      gender: "M", 
      grade: "8",
      debtor_code: "DEB2002",
      parent1_id: 3003,
      accountable_person_id: 3003,
      date_of_birth: "2009-07-22",
      home_language: "Afrikaans",
      contact_details: {
        email: "liam.vandermerwe@student.greenwood.za",
        phone: "0832345678",
        address: "456 Protea Avenue, Cape Town, 8001"
      }
    },
    {
      learner_id: 2003,
      first_name: "Kgothatso",
      last_name: "Molefe",
      gender: "M",
      grade: "9",
      debtor_code: "DEB2003", 
      parent1_id: 3004,
      parent2_id: 3005,
      accountable_person_id: 3004,
      date_of_birth: "2008-11-08",
      home_language: "Setswana",
      contact_details: {
        email: "kgothatso.molefe@student.riverside.za",
        phone: "0843456789",
        address: "789 Baobab Road, Pretoria, 0001"
      }
    },
    {
      learner_id: 2004,
      first_name: "Sarah",
      last_name: "Johnson",
      gender: "F",
      grade: "10",
      debtor_code: "DEB2004",
      parent1_id: 3006,
      accountable_person_id: 3006,
      date_of_birth: "2007-05-12",
      home_language: "English",
      contact_details: {
        email: "sarah.johnson@student.riverside.za",
        phone: "0854567890",
        address: "321 Oak Street, Durban, 4001"
      }
    }
  ];

  // Mock staff data
  private mockStaff: MockD6Staff[] = [
    {
      staff_id: 4001,
      first_name: "Patricia", 
      last_name: "Mthembu",
      email: "p.mthembu@greenwood.school.za",
      phone: "0111234567",
      role: "Mathematics Teacher",
      subjects: ["Mathematics", "Physical Sciences"],
      grades: ["7", "8", "9"]
    },
    {
      staff_id: 4002,
      first_name: "David",
      last_name: "Williams", 
      email: "d.williams@riverside.edu.za",
      phone: "0112345678",
      role: "English Teacher",
      subjects: ["English Home Language", "English First Additional Language"],
      grades: ["10", "11", "12"]
    },
    {
      staff_id: 4003,
      first_name: "Nomsa",
      last_name: "Dlamini",
      email: "n.dlamini@sunnydale.co.za",
      phone: "0113456789",
      role: "Principal",
      subjects: [],
      grades: []
    }
  ];

  // Mock parent data
  private mockParents: MockD6Parent[] = [
    {
      parent_id: 3001,
      first_name: "Themba",
      last_name: "Ngcobo",
      email: "themba.ngcobo@email.com",
      phone: "0821234567",
      relationship: "Father",
      learner_ids: [2001]
    },
    {
      parent_id: 3002,
      first_name: "Nomhle",
      last_name: "Ngcobo", 
      email: "nomhle.ngcobo@email.com",
      phone: "0821234568",
      relationship: "Mother",
      learner_ids: [2001]
    },
    {
      parent_id: 3003,
      first_name: "Pieter",
      last_name: "Van Der Merwe",
      email: "pieter.vdm@email.com", 
      phone: "0832345678",
      relationship: "Father",
      learner_ids: [2002]
    },
    {
      parent_id: 3004,
      first_name: "Mmabatho",
      last_name: "Molefe",
      email: "mmabatho.molefe@email.com",
      phone: "0843456789", 
      relationship: "Mother",
      learner_ids: [2003]
    }
  ];

  // Mock marks data
  private mockMarks: MockD6Mark[] = [
    {
      mark_id: 5001,
      learner_id: 2001,
      subject_code: "MATH",
      subject_name: "Mathematics",
      term: 1,
      year: 2024,
      mark_value: 78,
      mark_type: "Test",
      assessment_date: "2024-03-15"
    },
    {
      mark_id: 5002,
      learner_id: 2001,
      subject_code: "ENG",
      subject_name: "English Home Language",
      term: 1,
      year: 2024,
      mark_value: 85,
      mark_type: "Assignment",
      assessment_date: "2024-03-20"
    },
    {
      mark_id: 5003,
      learner_id: 2002,
      subject_code: "AFR",
      subject_name: "Afrikaans",
      term: 1,
      year: 2024,
      mark_value: 92,
      mark_type: "Test",
      assessment_date: "2024-03-18"
    },
    {
      mark_id: 5004,
      learner_id: 2003,
      subject_code: "PHYS",
      subject_name: "Physical Sciences",
      term: 1,
      year: 2024,
      mark_value: 73,
      mark_type: "Practical",
      assessment_date: "2024-03-22"
    }
  ];

  public static getInstance(): D6MockDataService {
    if (!D6MockDataService.instance) {
      D6MockDataService.instance = new D6MockDataService();
    }
    return D6MockDataService.instance;
  }

  /**
   * Get mock authorized schools (client integrations)
   */
  public getClientIntegrations(schoolId?: number): MockD6ClientIntegration[] {
    logger.info('Returning mock D6 client integrations', { 
      requestedSchoolId: schoolId,
      totalSchools: this.mockSchools.length 
    });

    if (schoolId) {
      return this.mockSchools.filter(school => 
        school.school_id === schoolId || school.school_login_id === schoolId.toString()
      );
    }
    
    return this.mockSchools;
  }

  /**
   * Get mock learners for a school
   */
  public getLearners(schoolId: number, options: { limit?: number; offset?: number } = {}): MockD6Learner[] {
    const { limit = 50, offset = 0 } = options;
    
    logger.info('Returning mock D6 learners', { 
      schoolId, 
      limit, 
      offset,
      totalLearners: this.mockLearners.length 
    });

    // For simplicity, return all learners regardless of school
    // In reality, you'd filter by school
    return this.mockLearners.slice(offset, offset + limit);
  }

  /**
   * Get specific learner by ID
   */
  public getLearnerById(learnerId: number): MockD6Learner | null {
    const learner = this.mockLearners.find(l => l.learner_id === learnerId);
    
    logger.info('Returning mock D6 learner by ID', { 
      learnerId, 
      found: !!learner 
    });
    
    return learner || null;
  }

  /**
   * Get mock staff for a school
   */
  public getStaff(schoolId: number): MockD6Staff[] {
    logger.info('Returning mock D6 staff', { 
      schoolId,
      totalStaff: this.mockStaff.length 
    });
    
    return this.mockStaff;
  }

  /**
   * Get mock parents
   */
  public getParents(schoolId: number): MockD6Parent[] {
    logger.info('Returning mock D6 parents', { 
      schoolId,
      totalParents: this.mockParents.length 
    });
    
    return this.mockParents;
  }

  /**
   * Get mock marks for a learner
   */
  public getMarks(learnerId: number, options: { term?: number; year?: number } = {}): MockD6Mark[] {
    const { term, year } = options;
    
    let marks = this.mockMarks.filter(mark => mark.learner_id === learnerId);
    
    if (term) {
      marks = marks.filter(mark => mark.term === term);
    }
    
    if (year) {
      marks = marks.filter(mark => mark.year === year);
    }
    
    logger.info('Returning mock D6 marks', { 
      learnerId, 
      term, 
      year,
      totalMarks: marks.length 
    });
    
    return marks;
  }

  /**
   * Get mock lookup data
   */
  public getLookupData(type: string): any[] {
    const lookupData: Record<string, any[]> = {
      genders: [
        { id: "M", name: "Male" },
        { id: "F", name: "Female" }
      ],
      grades: [
        { id: "R", name: "Grade R" },
        { id: "1", name: "Grade 1" },
        { id: "2", name: "Grade 2" },
        { id: "3", name: "Grade 3" },
        { id: "4", name: "Grade 4" },
        { id: "5", name: "Grade 5" },
        { id: "6", name: "Grade 6" },
        { id: "7", name: "Grade 7" },
        { id: "8", name: "Grade 8" },
        { id: "9", name: "Grade 9" },
        { id: "10", name: "Grade 10" },
        { id: "11", name: "Grade 11" },
        { id: "12", name: "Grade 12" }
      ],
      languages: [
        { id: "AFR", name: "Afrikaans" },
        { id: "ENG", name: "English" },
        { id: "ZUL", name: "IsiZulu" },
        { id: "XHO", name: "IsiXhosa" },
        { id: "TSW", name: "Setswana" },
        { id: "NSO", name: "Sesotho sa Leboa" },
        { id: "SOT", name: "Sesotho" },
        { id: "TSO", name: "Xitsonga" },
        { id: "SWA", name: "SiSwati" },
        { id: "VEN", name: "Tshivenda" },
        { id: "NBL", name: "IsiNdebele" }
      ],
      ethnicgroups: [
        { id: "BLK", name: "Black African" },
        { id: "COL", name: "Coloured" },
        { id: "IND", name: "Indian/Asian" },
        { id: "WHT", name: "White" },
        { id: "OTH", name: "Other" }
      ]
    };

    const data = lookupData[type] || [];
    
    logger.info('Returning mock D6 lookup data', { 
      type, 
      count: data.length 
    });
    
    return data;
  }

  /**
   * Generate additional mock data for comprehensive testing
   */
  public generateAdditionalTestData(): {
    learners: MockD6Learner[];
    staff: MockD6Staff[];
    parents: MockD6Parent[];
    marks: MockD6Mark[];
  } {
    logger.info('Generating additional mock test data');

    // Generate more diverse test data
    const additionalLearners: MockD6Learner[] = [];
    const additionalStaff: MockD6Staff[] = [];
    const additionalParents: MockD6Parent[] = [];
    const additionalMarks: MockD6Mark[] = [];

    // South African names for authenticity
    const firstNames = {
      male: ["Thabo", "Sipho", "Kagiso", "Mpho", "Tebogo", "Refiloe", "Lerato", "Karabo"],
      female: ["Nomsa", "Precious", "Lerato", "Thandeka", "Busisiwe", "Nokuthula", "Zinhle", "Palesa"]
    };
    
    const surnames = ["Mthembu", "Nkomo", "Dlamini", "Khumalo", "Mokoena", "Mahlangu", "Sithole", "Mabasa"];

    // Generate 50 additional learners
    for (let i = 0; i < 50; i++) {
      const learnerId = 2100 + i;
      const gender = Math.random() > 0.5 ? "M" : "F";
      const firstName = gender === "M" 
        ? firstNames.male[Math.floor(Math.random() * firstNames.male.length)]
        : firstNames.female[Math.floor(Math.random() * firstNames.female.length)];
      const lastName = surnames[Math.floor(Math.random() * surnames.length)];
      const grade = String(Math.floor(Math.random() * 12) + 1);

      additionalLearners.push({
        learner_id: learnerId,
        first_name: firstName,
        last_name: lastName,
        gender,
        grade,
        debtor_code: `DEB${learnerId}`,
        parent1_id: 3100 + i,
        accountable_person_id: 3100 + i,
        date_of_birth: `${2024 - parseInt(grade) - 6}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        home_language: ["Zulu", "English", "Afrikaans", "Setswana", "Xhosa"][Math.floor(Math.random() * 5)],
        contact_details: {
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@student.school.za`,
          phone: `08${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
          address: `${Math.floor(Math.random() * 999) + 1} Street Name, City, ${Math.floor(Math.random() * 9000) + 1000}`
        }
      });

      // Generate marks for each learner
      const subjects = ["MATH", "ENG", "AFR", "PHYS", "CHEM", "BIO", "HIST", "GEOG"];
      for (let j = 0; j < 3; j++) {
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        additionalMarks.push({
          mark_id: 5100 + (i * 3) + j,
          learner_id: learnerId,
          subject_code: subject,
          subject_name: subject === "MATH" ? "Mathematics" : subject === "ENG" ? "English" : subject,
          term: Math.floor(Math.random() * 4) + 1,
          year: 2024,
          mark_value: Math.floor(Math.random() * 40) + 50, // 50-90 range
          mark_type: ["Test", "Assignment", "Exam", "Practical"][Math.floor(Math.random() * 4)],
          assessment_date: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`
        });
      }
    }

    return {
      learners: additionalLearners,
      staff: additionalStaff,
      parents: additionalParents,
      marks: additionalMarks
    };
  }
}

// Export singleton instance
export const d6MockData = D6MockDataService.getInstance(); 