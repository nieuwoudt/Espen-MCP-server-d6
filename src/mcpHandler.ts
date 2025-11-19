/**
 * Shared MCP Handler for Espen D6 School Management System
 * Used by both Cloudflare Worker and Vercel deployments
 */

export interface EnvLike {
  D6_API_USERNAME?: string;
  D6_API_PASSWORD?: string;
  D6_API_BASE_URL?: string;
  D6_MOCK_MODE?: string;
  D6_ALLOWED_SCHOOL_LOGIN_IDS?: string;
  D6_SCHOOL_MAP?: string;
  NODE_ENV?: string;
  ESPEN_ENV?: string;
}

interface MCPRequest {
  jsonrpc: string;
  id?: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id?: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

type GradeDistribution = Record<number, number>;

interface SchoolProfile {
  school_login_id: string;
  school_name: string;
  admin_email_address: string;
  api_type: string;
  activated_by_integrator: 'Yes' | 'No';
  gradeRange: {
    min: number;
    max: number;
  };
  gradeDistribution: GradeDistribution;
  languagesOffered?: string[];
}

const LAERSKOOL_MONUMENTPARK_PROFILE: SchoolProfile = {
  school_login_id: 'laerskool-monumentpark',
  school_name: 'Laerskool Monumentpark',
  admin_email_address: 'info@monumentpark.co.za',
  api_type: 'Admin+ API',
  activated_by_integrator: 'Yes',
  gradeRange: {
    min: 1,
    max: 7,
  },
  gradeDistribution: {
    1: 190,
    2: 185,
    3: 180,
    4: 180,
    5: 180,
    6: 177,
    7: 178,
  },
  languagesOffered: ['Afrikaans', 'English', 'Zulu', 'Setswana', 'Sesotho'],
};

const ACTIVE_SCHOOL_PROFILE = LAERSKOOL_MONUMENTPARK_PROFILE;
const SUPPORTED_GRADES = Object.keys(ACTIVE_SCHOOL_PROFILE.gradeDistribution)
  .map((grade) => Number(grade))
  .sort((a, b) => a - b);

const DEFAULT_SCHOOL_LOGIN_ID = 1352;

// Multi-school helper functions
export function parseAllowedSchools(env: EnvLike): number[] {
  return (env.D6_ALLOWED_SCHOOL_LOGIN_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(Number);
}

export function assertSchoolAllowed(env: EnvLike, schoolLoginId: number): void {
  const allowed = parseAllowedSchools(env);
  if (allowed.length === 0) {
    // If no whitelist is configured, allow all (backward compatibility)
    return;
  }
  if (!allowed.includes(schoolLoginId)) {
    throw new Error(`School login id ${schoolLoginId} is not in D6_ALLOWED_SCHOOL_LOGIN_IDS.`);
  }
}

export function getSchoolName(env: EnvLike, schoolLoginId: number): string | undefined {
  const mapString = env.D6_SCHOOL_MAP || '';
  const map = Object.fromEntries(
    mapString
      .split(',')
      .map(pair => pair.split(':'))
      .filter(([id, name]) => id && name)
      .map(([id, name]) => [id.trim(), name.trim()])
  );
  return map[String(schoolLoginId)];
}

const isMockMode = (env: EnvLike) => env.D6_MOCK_MODE === 'true';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface D6RequestOptions {
  query?: Record<string, unknown>;
  body?: unknown;
  traceLabel?: string;
}

async function d6Request<T>(
  env: EnvLike,
  method: HttpMethod,
  path: string,
  options: D6RequestOptions = {}
): Promise<T> {
  const username = env.D6_API_USERNAME;
  const password = env.D6_API_PASSWORD;
  if (!username || !password) {
    throw new Error('D6_API_USERNAME or D6_API_PASSWORD not set');
  }

  const baseUrl = env.D6_API_BASE_URL || 'https://integrate.d6plus.co.za/api';
  const url = new URL(`${baseUrl}${path}`);
  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      'HTTP-X-USERNAME': username,
      'HTTP-X-PASSWORD': password,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Always read response as text first to handle empty bodies safely
  const rawText = await response.text().catch(() => '');
  
  // Enhanced logging with body content
  if (options.traceLabel) {
    const bodyPreview = rawText ? (rawText.length > 100 ? rawText.substring(0, 100) + '...' : rawText) : '<empty>';
    console.log(`[D6 TRACE] ${method} ${url.pathname}${url.search} -> ${response.status} (${options.traceLabel}) body=${bodyPreview}`);
  }

  // Parse response data if present
  let parsed: any = null;
  if (rawText && rawText.trim().length > 0) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Not valid JSON, return raw text
      parsed = rawText;
    }
  }

  // Handle errors
  if (!response.ok) {
    const errorMsg = typeof parsed === 'string' ? parsed : JSON.stringify(parsed || response.statusText);
    throw new Error(`D6 error ${response.status} on ${method} ${path}: ${errorMsg}`);
  }

  // For successful responses (including 204 No Content), return data
  // If body is empty (204 or empty 200), parsed will be null - that's expected
  return parsed as T;
}

function getSchoolInfoByLoginId(env: EnvLike, loginId: number, traceLabel = 'school') {
  return d6Request(env, 'GET', `/v1/adminplus/school/${loginId}`, {
    traceLabel: `${traceLabel}/${loginId}`,
  });
}

function getStaffByLoginId(
  env: EnvLike,
  loginId: number,
  params: { limit?: number; cursor?: string } = {},
  traceLabel = 'staffmembers'
) {
  return d6Request(env, 'GET', `/v1/adminplus/staffmembers/${loginId}`, {
    query: {
      limit: params.limit,
      cursor: params.cursor,
    },
    traceLabel: `${traceLabel}/${loginId}`,
  });
}

function getLearnersByLoginId(
  env: EnvLike,
  loginId: number,
  params: { limit?: number; cursor?: string } = {},
  traceLabel = 'learners'
) {
  return d6Request(env, 'GET', `/v1/adminplus/learners/${loginId}`, {
    query: {
      limit: params.limit,
      cursor: params.cursor,
    },
    traceLabel: `${traceLabel}/${loginId}`,
  });
}

function getParentsByLoginId(
  env: EnvLike,
  loginId: number,
  params: { limit?: number; cursor?: string } = {},
  traceLabel = 'parents'
) {
  return d6Request(env, 'GET', `/v1/adminplus/parents/${loginId}`, {
    query: {
      limit: params.limit,
      cursor: params.cursor,
    },
    traceLabel: `${traceLabel}/${loginId}`,
  });
}

function getLearnerMarksFromD6(
  env: EnvLike,
  loginId: number,
  learnerId: string | number,
  traceLabel = 'learner_subject_marks'
) {
  return d6Request(env, 'GET', `/v1/currplus/learnersubjectmarks/${loginId}`, {
    query: {
      learner_id: learnerId,
    },
    traceLabel: `${traceLabel}/${loginId}?learner_id=${learnerId}`,
  });
}

function getLearnerSubjectsFromD6(
  env: EnvLike,
  loginId: number,
  learnerId: string | number,
  traceLabel = 'learner_subjects'
) {
  return d6Request(env, 'GET', `/v1/currplus/learnersubjects/${loginId}`, {
    query: {
      learner_id: learnerId,
    },
    traceLabel: `${traceLabel}/${loginId}?learner_id=${learnerId}`,
  });
}

function getLearnerSubjectsPerTermFromD6(
  env: EnvLike,
  loginId: number,
  learnerId: string | number,
  traceLabel = 'learner_subjects_per_term'
) {
  return d6Request(env, 'GET', `/v1/currplus/learnersubjectsperterm/${loginId}`, {
    query: {
      learner_id: learnerId,
    },
    traceLabel: `${traceLabel}/${loginId}?learner_id=${learnerId}`,
  });
}

/**
 * List all D6 client integrations for this integrator account
 */
async function getD6Clients(env: EnvLike): Promise<any> {
  return d6Request(env, 'GET', '/v1/settings/clients', {
    traceLabel: 'settings/clients',
  });
}

/**
 * Enable D6 Client Integration for a school
 * Per Patrick's specification: use v1, PATCH, school_id in URL path (not body)
 */
async function enableD6ClientIntegration(
  env: EnvLike,
  schoolId: number,
  apiTypeId: number,
  state: 0 | 1 = 1
): Promise<any> {
  return d6Request(env, 'PATCH', `/v1/settings/clients/${schoolId}`, {
    body: {
      api_type_id: apiTypeId,
      state,
    },
    traceLabel: `settings/clients/${schoolId} [api_type_id=${apiTypeId}, state=${state}]`,
  });
}

const formatD6Error = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

function extractItemsFromD6Response(data: any): any[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.items)) {
    return data.items;
  }
  if (Array.isArray(data?.data)) {
    return data.data;
  }
  if (Array.isArray(data?.results)) {
    return data.results;
  }
  return [];
}

const logToolInvocation = (
  toolName: string,
  mockMode: boolean,
  details?: Record<string, unknown>
) => {
  const suffix = details ? ` details=${JSON.stringify(details)}` : '';
  console.log(`[TOOL] ${toolName} mock=${mockMode}${suffix}`);
};

// Comprehensive Mock Data Generator
function generateComprehensiveMockData() {
  // Authentic South African names
  const firstNames = {
    male: ["Thabo", "Sipho", "Kagiso", "Mpho", "Tebogo", "Refiloe", "Lerato", "Karabo", "Mandla", "Sibusiso", "Khulani", "Mthokozisi", "Blessing", "Gift", "Prince", "Wonder"],
    female: ["Nomsa", "Precious", "Lerato", "Thandeka", "Busisiwe", "Nokuthula", "Zinhle", "Palesa", "Nomthandazo", "Sibongile", "Nonkululeko", "Patience", "Grace", "Faith", "Hope", "Joy"]
  };
  
  const surnames = ["Mthembu", "Nkomo", "Dlamini", "Khumalo", "Mokoena", "Mahlangu", "Sithole", "Mabasa", "Ngcobo", "Molefe", "Radebe", "Chabalala", "Mnguni", "Nxumalo", "Zungu", "Vilakazi"];
  
  const languages = ["Zulu", "English", "Afrikaans", "Setswana", "Xhosa", "Sesotho", "Sepedi", "Tsonga", "Venda", "Ndebele", "Swati"];
  
  const subjects = [
    { code: "MATH", name: "Mathematics" },
    { code: "ENG", name: "English Home Language" },
    { code: "AFR", name: "Afrikaans First Additional Language" },
    { code: "PHYS", name: "Physical Sciences" },
    { code: "CHEM", name: "Chemistry" },
    { code: "BIO", name: "Life Sciences" },
    { code: "HIST", name: "History" },
    { code: "GEOG", name: "Geography" },
    { code: "ACC", name: "Accounting" },
    { code: "ECON", name: "Economics" },
    { code: "IT", name: "Information Technology" },
    { code: "ART", name: "Visual Arts" }
  ];

  const schools = [
    {
      school_login_id: ACTIVE_SCHOOL_PROFILE.school_login_id,
      school_name: ACTIVE_SCHOOL_PROFILE.school_name,
      admin_email_address: ACTIVE_SCHOOL_PROFILE.admin_email_address,
      api_type: ACTIVE_SCHOOL_PROFILE.api_type,
      activated_by_integrator: ACTIVE_SCHOOL_PROFILE.activated_by_integrator
    }
  ];

  // Generate learners constrained to the active school's grade distribution
  const learners: any[] = [];
  let learnerIdCounter = 2000;
  Object.entries(ACTIVE_SCHOOL_PROFILE.gradeDistribution).forEach(([gradeKey, count]) => {
    const grade = Number(gradeKey);
    for (let i = 0; i < count; i++) {
      const gender = Math.random() > 0.5 ? "M" : "F";
      const firstName = gender === "M"
        ? firstNames.male[Math.floor(Math.random() * firstNames.male.length)]
        : firstNames.female[Math.floor(Math.random() * firstNames.female.length)];
      const lastName = surnames[Math.floor(Math.random() * surnames.length)];
      const languagePool = ACTIVE_SCHOOL_PROFILE.languagesOffered?.length
        ? ACTIVE_SCHOOL_PROFILE.languagesOffered
        : languages;
      const language = languagePool[Math.floor(Math.random() * languagePool.length)];
      const classSuffix = String.fromCharCode(65 + Math.floor(Math.random() * 3));

      learners.push({
        LearnerID: (learnerIdCounter++).toString(),
        FirstName: firstName,
        LastName: lastName,
        Grade: grade,
        Gender: gender,
        LanguageOfInstruction: "English",
        HomeLanguage: language,
        Class: `Grade ${grade}${classSuffix}`,
        Email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@student.school.za`,
        Phone: `08${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
        EnrollmentDate: `20${String(24 - (grade - 1)).padStart(2, '0')}-01-15`,
        IsActive: true,
        DateOfBirth: `${2018 - grade}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`
      });
    }
  });

  // Generate 77+ staff members (matching D6 API expected volumes)
  const staffPositions = [
    "Principal", "Deputy Principal", "Head of Department - Mathematics", "Head of Department - English", 
    "Head of Department - Sciences", "Head of Department - Languages", "Head of Department - Social Sciences",
    "Mathematics Teacher", "English Teacher", "Afrikaans Teacher", "Physical Sciences Teacher", 
    "Life Sciences Teacher", "Chemistry Teacher", "Physics Teacher", "Biology Teacher",
    "History Teacher", "Geography Teacher", "Life Orientation Teacher", "Business Studies Teacher",
    "Accounting Teacher", "Economics Teacher", "Information Technology Teacher",
    "Physical Education Teacher", "Arts Teacher", "Music Teacher", "Drama Teacher",
    "Foundation Phase Teacher", "Intermediate Phase Teacher", "Senior Phase Teacher",
    "Special Needs Teacher", "Remedial Teacher", "School Counselor", "School Psychologist",
    "Librarian", "Media Center Coordinator", "Administrative Assistant", "Secretary",
    "Finance Officer", "Human Resources Officer", "IT Coordinator", "Network Administrator",
    "Maintenance Supervisor", "Groundskeeper", "Security Officer", "Cafeteria Manager",
    "Transport Coordinator", "Sports Coach", "Extra-curricular Coordinator"
  ];

  const staff: any[] = [];
  for (let i = 0; i < 77; i++) {
    const staffId = 4000 + i;
    const gender = Math.random() > 0.5 ? "M" : "F";
    const firstName = gender === "M" 
      ? firstNames.male[Math.floor(Math.random() * firstNames.male.length)]
      : firstNames.female[Math.floor(Math.random() * firstNames.female.length)];
    const lastName = surnames[Math.floor(Math.random() * surnames.length)];
    const position = staffPositions[Math.floor(Math.random() * staffPositions.length)];

    staff.push({
      StaffID: staffId.toString(),
      FirstName: firstName,
      LastName: lastName,
      Position: position,
      Department: position.includes("Teacher") ? position.replace(" Teacher", "") : "Administration",
      Email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@school.za`,
      Phone: `011${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
      SubjectsTaught: position.includes("Teacher") ? [subjects[Math.floor(Math.random() * subjects.length)].name] : [],
      IsActive: true
    });
  }

  // Generate 1,523+ parents (matching D6 API expected volumes)
  const parents: any[] = [];
  const relationships = ["Father", "Mother", "Guardian", "Grandfather", "Grandmother", "Stepfather", "Stepmother", "Foster Parent", "Legal Guardian"];
  let parentIdCounter = 3000;
  
  learners.forEach((learner) => {
    // Generate 1-2 parents per learner to reach ~1,523 total
    const numParents = Math.random() > 0.2 ? 2 : 1;
    
    for (let p = 0; p < numParents; p++) {
      const parentId = parentIdCounter++;
      const gender = p === 0 ? (Math.random() > 0.5 ? "M" : "F") : (Math.random() > 0.5 ? "F" : "M");
      const firstName = gender === "M" 
        ? firstNames.male[Math.floor(Math.random() * firstNames.male.length)]
        : firstNames.female[Math.floor(Math.random() * firstNames.female.length)];
      
      const sameFamily = Math.random() > 0.3;
      const lastName = sameFamily ? learner.LastName : surnames[Math.floor(Math.random() * surnames.length)];
      
      let relationshipType;
      if (p === 0) {
        relationshipType = gender === "M" ? "Father" : "Mother";
      } else {
        relationshipType = gender === "M" ? "Father" : "Mother";
        if (Math.random() > 0.8) {
          relationshipType = relationships[Math.floor(Math.random() * relationships.length)];
        }
      }
      
      parents.push({
        ParentID: parentId.toString(),
        FirstName: firstName,
        LastName: lastName,
        Email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
        Phone: `08${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
        RelationshipType: relationshipType,
        LearnerIDs: [learner.LearnerID],
        IsPrimaryContact: p === 0,
        Address: `${Math.floor(Math.random() * 999) + 1} ${lastName} Street, ${['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein'][Math.floor(Math.random() * 6)]}, ${Math.floor(Math.random() * 9000) + 1000}`,
        WorkPhone: Math.random() > 0.6 ? `011${String(Math.floor(Math.random() * 9000000) + 1000000)}` : null,
        Occupation: ['Teacher', 'Nurse', 'Engineer', 'Accountant', 'Manager', 'Technician', 'Sales Rep', 'Consultant', 'Driver', 'Administrator'][Math.floor(Math.random() * 10)]
      });
    }
  });

  // Generate comprehensive academic marks for all learners
  const marks: any[] = [];
  let markIdCounter = 5000;
  
  learners.forEach((learner) => {
    const learnerGrade = learner.Grade;
    
    let subjectsForGrade;
    if (learnerGrade <= 3) {
      subjectsForGrade = [
        { code: "ENG", name: "English Home Language" },
        { code: "AFR", name: "Afrikaans First Additional Language" },
        { code: "MATH", name: "Mathematics" },
        { code: "LO", name: "Life Skills" }
      ];
    } else if (learnerGrade <= 6) {
      subjectsForGrade = [
        { code: "ENG", name: "English Home Language" },
        { code: "AFR", name: "Afrikaans First Additional Language" },
        { code: "MATH", name: "Mathematics" },
        { code: "NS", name: "Natural Sciences" },
        { code: "SS", name: "Social Sciences" },
        { code: "LO", name: "Life Orientation" }
      ];
    } else if (learnerGrade <= 9) {
      subjectsForGrade = [
        { code: "ENG", name: "English Home Language" },
        { code: "AFR", name: "Afrikaans First Additional Language" },
        { code: "MATH", name: "Mathematics" },
        { code: "NS", name: "Natural Sciences" },
        { code: "SS", name: "Social Sciences" },
        { code: "LO", name: "Life Orientation" },
        { code: "TECH", name: "Technology" },
        { code: "EMS", name: "Economic and Management Sciences" }
      ];
    } else {
      subjectsForGrade = [
        { code: "ENG", name: "English Home Language" },
        { code: "AFR", name: "Afrikaans First Additional Language" },
        { code: "MATH", name: "Mathematics" },
        { code: "PHYS", name: "Physical Sciences" },
        { code: "BIO", name: "Life Sciences" },
        { code: "ACC", name: "Accounting" },
        { code: "ECON", name: "Economics" },
        { code: "HIST", name: "History" },
        { code: "GEOG", name: "Geography" },
        { code: "LO", name: "Life Orientation" }
      ];
    }
    
    subjectsForGrade.forEach((subject) => {
      for (let term = 1; term <= 4; term++) {
        const assessmentsInTerm = Math.floor(Math.random() * 3) + 2;
        
        for (let assessment = 0; assessment < assessmentsInTerm; assessment++) {
          const markTypes = ["Test", "Assignment", "Project", "Exam", "Practical", "Oral", "Portfolio"];
          const markType = markTypes[Math.floor(Math.random() * markTypes.length)];
          
          let markRange;
          if (learnerGrade <= 6) {
            markRange = { min: 40, max: 95 };
          } else if (learnerGrade <= 9) {
            markRange = { min: 35, max: 90 };
          } else {
            markRange = { min: 30, max: 85 };
          }
          
          const markValue = Math.floor(Math.random() * (markRange.max - markRange.min + 1)) + markRange.min;
          const totalMarks = markType === "Test" ? 50 : (markType === "Exam" ? 100 : 20);
          
          marks.push({
            MarkID: markIdCounter++,
            LearnerID: learner.LearnerID,
            SubjectCode: subject.code,
            SubjectName: subject.name,
            MarkValue: Math.round((markValue / 100) * totalMarks),
            TotalMarks: totalMarks,
            MarkType: markType,
            Term: term,
            Year: 2024,
            AssessmentDate: `2024-${String(Math.floor(Math.random() * 3) + (term * 3 - 2)).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
            TeacherComment: Math.random() > 0.7 ? ["Excellent work", "Good effort", "Needs improvement", "Outstanding performance", "Keep it up"][Math.floor(Math.random() * 5)] : null
          });
        }
      }
    });
  });

  return { schools, learners, staff, parents, subjects, marks };
}

// Generate the comprehensive mock data (only used when mock mode is enabled)
const MOCK_SCHOOL_DATA = generateComprehensiveMockData();

// MCP Tools Registry
const MCP_TOOLS = [
  {
    name: "get_schools",
    description: "Get information about schools/client integrations in the D6 system",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: "get_learners",
    description: "Get learners from the D6 system with optional school filtering and pagination (defaults to 50 records).",
    inputSchema: {
      type: "object",
      properties: {
        schoolId: { type: "string", description: "Optional school ID to filter learners" },
        school_login_id: { type: "integer", description: "Optional school login ID (numeric)" },
        limit: { type: "string", description: "Optional: Limit records for pagination (default: 50)" },
        offset: { type: "string", description: "Optional: Skip records for pagination (default: 0)" }
      },
      additionalProperties: false
    }
  },
  {
    name: "get_staff",
    description: "⚠️ RETURNS ALL STAFF MEMBERS. Complete staff directory with positions, departments, and contact information.",
    inputSchema: {
      type: "object",
      properties: {
        schoolId: { type: "string", description: "Optional school ID to filter staff" },
        school_login_id: { type: "integer", description: "Optional school login ID (numeric)" }
      },
      additionalProperties: false
    }
  },
  {
    name: "get_parents",
    description: "⚠️ RETURNS ALL PARENTS. Complete parent database with contact details and learner relationships.",
    inputSchema: {
      type: "object",
      properties: {
        schoolId: { type: "string", description: "Optional school ID to filter parents" },
        school_login_id: { type: "integer", description: "Optional school login ID (numeric)" }
      },
      additionalProperties: false
    }
  },
  {
    name: "get_learner_marks",
    description: "Get academic marks for a specific learner from Curriculum+ (learnersubjectmarks endpoint)",
    inputSchema: {
      type: "object",
      properties: {
        learnerId: { type: "string", description: "The ID of the learner to get marks for" },
        school_login_id: { type: "integer", description: "Optional school login ID (numeric)" }
      },
      required: ["learnerId"],
      additionalProperties: false
    }
  },
  {
    name: "get_learner_subjects",
    description: "Get all subjects for a specific learner from Curriculum+ (learnersubjects endpoint)",
    inputSchema: {
      type: "object",
      properties: {
        learnerId: { type: "string", description: "The ID of the learner to get subjects for" },
        school_login_id: { type: "integer", description: "Optional school login ID (numeric)" }
      },
      required: ["learnerId"],
      additionalProperties: false
    }
  },
  {
    name: "get_learner_subjects_per_term",
    description: "Get subject marks per term for a specific learner from Curriculum+ (learnersubjectsperterm endpoint)",
    inputSchema: {
      type: "object",
      properties: {
        learnerId: { type: "string", description: "The ID of the learner to get term-based subject data for" },
        school_login_id: { type: "integer", description: "Optional school login ID (numeric)" }
      },
      required: ["learnerId"],
      additionalProperties: false
    }
  },
  {
    name: "get_lookup_data",
    description: "Get lookup/reference data from the D6 system",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Type of lookup data (genders, grades)" }
      },
      additionalProperties: false
    }
  },
  {
    name: "get_system_health",
    description: "Check the health status of the D6 API integration",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: "get_integration_info",
    description: "Get information about the D6 integration configuration",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: "get_all_learners",
    description: "📋 REDUNDANT: get_learners now returns ALL data by default. This tool is kept for compatibility. Use get_learners instead.",
    inputSchema: {
      type: "object",
      properties: {
        schoolId: { type: "string", description: "Optional school ID to filter learners" },
        school_login_id: { type: "integer", description: "Optional school login ID (numeric)" }
      },
      additionalProperties: false
    }
  },
  {
    name: "get_learners_by_language",
    description: "🎯 OPTIMIZED: Get learners filtered by home language (e.g., 'Afrikaans', 'English', 'Zulu'). Returns focused results instead of full dataset.",
    inputSchema: {
      type: "object",
      properties: {
        homeLanguage: { type: "string", description: "Home language to filter by (e.g., 'Afrikaans', 'English', 'Zulu')" },
        schoolId: { type: "string", description: "Optional school ID" },
        school_login_id: { type: "integer", description: "Optional school login ID (numeric)" }
      },
      required: ["homeLanguage"],
      additionalProperties: false
    }
  },
  {
    name: "get_learners_by_grade",
    description: "🎯 OPTIMIZED: Get learners filtered by grade level (1-12). Returns focused results instead of full dataset.",
    inputSchema: {
      type: "object",
      properties: {
        grade: { type: "string", description: "Grade level to filter by (1-12)" },
        schoolId: { type: "string", description: "Optional school ID" },
        school_login_id: { type: "integer", description: "Optional school login ID (numeric)" }
      },
      required: ["grade"],
      additionalProperties: false
    }
  },
  {
    name: "get_data_summary",
    description: "📊 ANALYSIS: Get summary statistics of the school data (total counts, language distribution, grade distribution).",
    inputSchema: {
      type: "object",
      properties: {
        schoolId: { type: "string", description: "Optional school ID" },
        school_login_id: { type: "integer", description: "Optional school login ID (numeric)" }
      },
      additionalProperties: false
    }
  },
  {
    name: "d6_get_school_info",
    description: "Fetch school information directly from the D6 Admin+ API using a school_login_id.",
    inputSchema: {
      type: "object",
      properties: {
        school_login_id: { type: "integer", description: "The D6 school_login_id (e.g., 1352 for Laerskool Monumentpark)" }
      },
      required: ["school_login_id"],
      additionalProperties: false
    }
  },
  {
    name: "d6_get_learners",
    description: "Fetch learners directly from the D6 Admin+ API using a school_login_id.",
    inputSchema: {
      type: "object",
      properties: {
        school_login_id: { type: "integer", description: "The D6 school_login_id" },
        limit: { type: "integer", description: "Number of learners to return (max 1000)", default: 50 },
        cursor: { type: "string", description: "Pagination cursor/offset token as expected by D6" }
      },
      required: ["school_login_id"],
      additionalProperties: false
    }
  },
  {
    name: "enable_d6_client",
    description: "Enable/configure a D6 API client integration for a school via v1/settings/clients. This is an admin operation to activate D6 features like marks access.",
    inputSchema: {
      type: "object",
      properties: {
        school_login_id: { 
          type: "integer", 
          description: "The D6 school_login_id to enable" 
        },
        api_type_id: { 
          type: "integer", 
          description: "The D6 API type ID (e.g., 8 for Integrate API)" 
        },
        state: { 
          type: "integer", 
          description: "State: 1 = enabled, 0 = disabled",
          enum: [0, 1],
          default: 1
        }
      },
      required: ["school_login_id", "api_type_id"],
      additionalProperties: false
    }
  },
  {
    name: "list_d6_schools",
    description: "List all schools this Espen D6 integrator is configured for, optionally filtered to activated and/or whitelisted schools.",
    inputSchema: {
      type: "object",
      properties: {
        only_active: {
          type: "boolean",
          description: "If true, only include schools where activated_by_integrator === 'Yes'.",
          default: true
        },
        only_whitelisted: {
          type: "boolean",
          description: "If true, only include schools in D6_ALLOWED_SCHOOL_LOGIN_IDS.",
          default: true
        }
      },
      additionalProperties: false
    }
  }
];

// Tool Handlers
async function handleToolCall(toolName: string, args: any, env: EnvLike, scopedSchoolId?: string): Promise<string> {
  const mockMode = isMockMode(env);
  
  // Normalize school ID from various parameter names
  const schoolLoginId = Number(
    scopedSchoolId ?? args?.school_login_id ?? args?.schoolId ?? DEFAULT_SCHOOL_LOGIN_ID
  );
  
  // Check if school is allowed (if whitelist is configured)
  try {
    assertSchoolAllowed(env, schoolLoginId);
  } catch (error) {
    return `❌ ${error instanceof Error ? error.message : 'School not allowed'}`;
  }
  
  const schoolName = getSchoolName(env, schoolLoginId);
  
  switch (toolName) {
    case 'get_schools':
      if (!mockMode) {
        try {
          logToolInvocation('get_schools', mockMode, { school_login_id: schoolLoginId, school_name: schoolName });
          const school = await getSchoolInfoByLoginId(env, schoolLoginId, 'get_schools');
          return `📚 **School Information (D6)**\n\n${JSON.stringify(school, null, 2)}`;
        } catch (error) {
          return `❌ D6 API error while fetching school info: ${formatD6Error(error)}`;
        }
      }
      return `📚 **Schools/Client Integrations** (Mock Data)\n\n${JSON.stringify(MOCK_SCHOOL_DATA.schools, null, 2)}\n\n✅ Data scoped to ${ACTIVE_SCHOOL_PROFILE.school_name}`;

    case 'get_learners': {
      const limit = Math.min(parseInt(args?.limit ?? '50', 10), 1000);
      const cursor = args?.cursor || args?.offset;
      if (!mockMode) {
        try {
          logToolInvocation('get_learners', mockMode, { school_login_id: schoolLoginId, school_name: schoolName, limit, cursor });
          const data = await getLearnersByLoginId(env, schoolLoginId, { limit, cursor }, 'get_learners');
          const learnersArray = extractItemsFromD6Response(data);
          return `👨‍🎓 **Learners Data (D6)** - School: ${schoolName || schoolLoginId} (${learnersArray.length} returned)\n\n${JSON.stringify(data, null, 2)}`;
        } catch (error) {
          return `❌ D6 API error while fetching learners: ${formatD6Error(error)}`;
        }
      }
      const mockData = generateComprehensiveMockData();
      const offset = parseInt(args?.offset || '0', 10);
      const paginatedLearners = mockData.learners.slice(offset, offset + limit);
      return `👨‍🎓 **Learners Data** (Mock Data - ${mockData.learners.length} total, showing ${paginatedLearners.length} from ${offset + 1})\n\n${JSON.stringify(paginatedLearners, null, 2)}${mockData.learners.length > offset + limit ? `\n\n📄 **Pagination**: next offset=${offset + limit}, limit=${limit}` : '\n\n✅ **All records shown**'}`;
    }

    case 'get_staff':
      if (!mockMode) {
        try {
          const limit = args?.limit ? Number(args.limit) : undefined;
          const cursor = args?.cursor;
          logToolInvocation('get_staff', mockMode, { school_login_id: schoolLoginId, school_name: schoolName, limit, cursor });
          const data = await getStaffByLoginId(env, schoolLoginId, { limit, cursor }, 'get_staff');
          return `👨‍🏫 **Staff Members (D6)** - School: ${schoolName || schoolLoginId}\n\n${JSON.stringify(data, null, 2)}`;
        } catch (error) {
          return `❌ D6 API error while fetching staff: ${formatD6Error(error)}`;
        }
      }
      {
        const mockStaffData = generateComprehensiveMockData();
        return `👨‍🏫 **ALL Staff Members** (Mock Data - ${mockStaffData.staff.length} total records - COMPLETE DATASET)\n\n${JSON.stringify(mockStaffData.staff, null, 2)}\n\n✅ **Complete dataset provided for ${ACTIVE_SCHOOL_PROFILE.school_name}**`;
      }

    case 'get_parents':
      if (!mockMode) {
        try {
          const limit = args?.limit ? Number(args.limit) : undefined;
          const cursor = args?.cursor;
          logToolInvocation('get_parents', mockMode, { school_login_id: schoolLoginId, school_name: schoolName, limit, cursor });
          const data = await getParentsByLoginId(env, schoolLoginId, { limit, cursor }, 'get_parents');
          return `👪 **Parents (D6)** - School: ${schoolName || schoolLoginId}\n\n${JSON.stringify(data, null, 2)}`;
        } catch (error) {
          return `❌ D6 API error while fetching parents: ${formatD6Error(error)}`;
        }
      }
      {
        const mockParentsData = generateComprehensiveMockData();
        return `👪 **ALL Parents Data** (Mock Data - ${mockParentsData.parents.length} total records - COMPLETE DATASET)\n\n${JSON.stringify(mockParentsData.parents, null, 2)}\n\n✅ **Complete dataset provided for ${ACTIVE_SCHOOL_PROFILE.school_name}**`;
      }

    case 'get_learner_marks': {
      const learnerId = args.learnerId;
      if (!learnerId) {
        throw new Error('learnerId parameter is required');
      }
      // D6 has enabled Curriculum+ - always use real data (no mock fallback)
      try {
        logToolInvocation('get_learner_marks', mockMode, { school_login_id: schoolLoginId, school_name: schoolName, learnerId });
        const data = await getLearnerMarksFromD6(env, schoolLoginId, learnerId, 'get_learner_marks');
        return `📊 **Academic Marks for Learner ${learnerId} (D6 Curriculum+)** - School: ${schoolName || schoolLoginId}\n\n${JSON.stringify(data, null, 2)}`;
      } catch (error) {
        return `❌ D6 API error while fetching learner marks: ${formatD6Error(error)}`;
      }
    }

    case 'get_learner_subjects': {
      const learnerId = args.learnerId;
      if (!learnerId) {
        throw new Error('learnerId parameter is required');
      }
      // D6 has enabled Curriculum+ - always use real data
      try {
        logToolInvocation('get_learner_subjects', mockMode, { school_login_id: schoolLoginId, school_name: schoolName, learnerId });
        const data = await getLearnerSubjectsFromD6(env, schoolLoginId, learnerId, 'get_learner_subjects');
        return `📚 **Subjects for Learner ${learnerId} (D6 Curriculum+)** - School: ${schoolName || schoolLoginId}\n\n${JSON.stringify(data, null, 2)}`;
      } catch (error) {
        return `❌ D6 API error while fetching learner subjects: ${formatD6Error(error)}`;
      }
    }

    case 'get_learner_subjects_per_term': {
      const learnerId = args.learnerId;
      if (!learnerId) {
        throw new Error('learnerId parameter is required');
      }
      // D6 has enabled Curriculum+ - always use real data
      try {
        logToolInvocation('get_learner_subjects_per_term', mockMode, { school_login_id: schoolLoginId, school_name: schoolName, learnerId });
        const data = await getLearnerSubjectsPerTermFromD6(env, schoolLoginId, learnerId, 'get_learner_subjects_per_term');
        return `📅 **Subjects Per Term for Learner ${learnerId} (D6 Curriculum+)** - School: ${schoolName || schoolLoginId}\n\n${JSON.stringify(data, null, 2)}`;
      } catch (error) {
        return `❌ D6 API error while fetching learner subjects per term: ${formatD6Error(error)}`;
      }
    }

    case 'get_lookup_data':
      if (!mockMode) {
        try {
          logToolInvocation('get_lookup_data', mockMode, {});
          const data = await d6Request(env, 'GET', '/v1/settings/genders', {
            traceLabel: 'settings/genders',
          });
          return `📋 **Lookup Data - Genders (D6)**\n\n${JSON.stringify(data, null, 2)}`;
        } catch (error) {
          return `❌ D6 API error while fetching lookup data: ${formatD6Error(error)}`;
        }
      }
      return `📋 **Lookup Data - Genders** (Mock Data)\n\n[\n  {"id": 1, "description": "Male"},\n  {"id": 2, "description": "Female"}\n]`;

    case 'get_system_health':
      if (!mockMode) {
        try {
          const start = Date.now();
          logToolInvocation('get_system_health', mockMode, { school_login_id: schoolLoginId });
          await getSchoolInfoByLoginId(env, schoolLoginId, 'get_system_health');
          const duration = Date.now() - start;
          const healthStatus = {
            status: "healthy",
            service: "espen-d6-mcp-remote",
            version: "1.0.0",
            apis: { adminPlus: true },
            response_time_ms: duration,
            timestamp: new Date().toISOString()
          };
          return `🏥 **System Health (D6)**\n\n${JSON.stringify(healthStatus, null, 2)}`;
        } catch (error) {
          return `❌ D6 API health check failed: ${formatD6Error(error)}`;
        }
      }
      const healthStatus = {
        status: "healthy",
        service: "espen-d6-mcp-remote",
        version: "1.0.0",
        apis: { mockMode: true },
        response_time_ms: 0,
        timestamp: new Date().toISOString()
      };
      return `🏥 **System Health**\n\n${JSON.stringify(healthStatus, null, 2)}`;

    case 'get_integration_info':
      if (!mockMode) {
        try {
          logToolInvocation('get_integration_info', mockMode, { school_login_id: schoolLoginId, school_name: schoolName });
          const school = await getSchoolInfoByLoginId(env, schoolLoginId, 'get_integration_info');
          return `ℹ️ **Integration Info (D6)** - School: ${schoolName || schoolLoginId}\n\n${JSON.stringify(school, null, 2)}`;
        } catch (error) {
          return `❌ D6 API error while fetching integration info: ${formatD6Error(error)}`;
        }
      }
      return `ℹ️ **Integration Info** (Mock Data)\n\n${JSON.stringify(MOCK_SCHOOL_DATA.schools[0], null, 2)}`;

    case 'get_all_learners':
      if (!mockMode) {
        const limit = Math.min(parseInt(args?.limit ?? '1000', 10), 1000);
        const cursor = args?.cursor;
        try {
          logToolInvocation('get_all_learners', mockMode, { school_login_id: schoolLoginId, school_name: schoolName, limit, cursor });
          const data = await getLearnersByLoginId(env, schoolLoginId, { limit, cursor }, 'get_all_learners');
          return `👨‍🎓 **ALL Learners (D6)** - School: ${schoolName || schoolLoginId} (showing up to ${limit} records)\n\n${JSON.stringify(data, null, 2)}`;
        } catch (error) {
          return `❌ D6 API error while fetching all learners: ${formatD6Error(error)}`;
        }
      }
      const allMockData = generateComprehensiveMockData();
      return `👨‍🎓 **ALL Learners** (Mock Data - ${allMockData.learners.length} total records)\n\n${JSON.stringify(allMockData.learners, null, 2)}\n\n✅ **Complete dataset provided**`;

    case 'get_learners_by_language': {
      const targetLanguage = args.homeLanguage;
      if (!targetLanguage) {
        throw new Error('homeLanguage parameter is required');
      }
      if (!mockMode) {
        try {
          logToolInvocation('get_learners_by_language', mockMode, { school_login_id: schoolLoginId, school_name: schoolName, homeLanguage: targetLanguage });
          const data = await getLearnersByLoginId(env, schoolLoginId, { limit: 5000 }, 'get_learners_by_language');
          const learners = extractItemsFromD6Response(data);
          const filtered = learners.filter((learner) => {
            const lang = (learner.home_language || learner.HomeLanguage || learner.homeLanguage || '').toLowerCase();
            return lang === targetLanguage.toLowerCase();
          });
          return `🎯 **Learners with ${targetLanguage} Home Language (D6)** - School: ${schoolName || schoolLoginId} (${filtered.length} found)\n\n${JSON.stringify(filtered, null, 2)}`;
        } catch (error) {
          return `❌ D6 API error while filtering by language: ${formatD6Error(error)}`;
        }
      }
      const mockDataForLanguage = generateComprehensiveMockData();
      const filteredByLanguage = mockDataForLanguage.learners.filter((learner) =>
        learner.HomeLanguage.toLowerCase() === targetLanguage.toLowerCase()
      );
      return `🎯 **Learners with ${targetLanguage} Home Language** (${filteredByLanguage.length} found from ${mockDataForLanguage.learners.length} total)\n\n${JSON.stringify(filteredByLanguage, null, 2)}\n\n✅ **Complete filtered results - all ${targetLanguage} speakers included**`;
    }

    case 'get_learners_by_grade': {
      const targetGrade = parseInt(args.grade);
      if (!targetGrade || !SUPPORTED_GRADES.includes(targetGrade)) {
        throw new Error(`grade parameter must be a number between ${ACTIVE_SCHOOL_PROFILE.gradeRange.min} and ${ACTIVE_SCHOOL_PROFILE.gradeRange.max}`);
      }
      if (!mockMode) {
        try {
          logToolInvocation('get_learners_by_grade', mockMode, { school_login_id: schoolLoginId, school_name: schoolName, grade: targetGrade });
          const data = await getLearnersByLoginId(env, schoolLoginId, { limit: 5000 }, 'get_learners_by_grade');
          const learners = extractItemsFromD6Response(data);
          const filtered = learners.filter((learner) => {
            const gradeValue = learner.grade || learner.Grade || learner.grade_id;
            return Number(gradeValue) === targetGrade;
          });
          return `🎯 **Grade ${targetGrade} Learners (D6)** - School: ${schoolName || schoolLoginId} (${filtered.length} found)\n\n${JSON.stringify(filtered, null, 2)}`;
        } catch (error) {
          return `❌ D6 API error while filtering by grade: ${formatD6Error(error)}`;
        }
      }
      const mockDataForGrade = generateComprehensiveMockData();
      const filteredByGrade = mockDataForGrade.learners.filter((learner) => learner.Grade === targetGrade);
      return `🎯 **Grade ${targetGrade} Learners** (${filteredByGrade.length} found from ${mockDataForGrade.learners.length} total)\n\n${JSON.stringify(filteredByGrade, null, 2)}\n\n✅ **Complete grade ${targetGrade} results**`;
    }

    case 'get_data_summary': {
      if (!mockMode) {
        try {
          logToolInvocation('get_data_summary', mockMode, { school_login_id: schoolLoginId, school_name: schoolName });
          const schoolInfoResponse: any = await getSchoolInfoByLoginId(env, schoolLoginId, 'get_data_summary:school');
          const learnersResponse = await getLearnersByLoginId(env, schoolLoginId, { limit: 5000 }, 'get_data_summary:learners');
          const staffResponse = await getStaffByLoginId(env, schoolLoginId, {}, 'get_data_summary:staff');
          const parentsResponse = await getParentsByLoginId(env, schoolLoginId, { limit: 5000 }, 'get_data_summary:parents');

          const learners = extractItemsFromD6Response(learnersResponse);
          const staff = extractItemsFromD6Response(staffResponse);
          const parents = extractItemsFromD6Response(parentsResponse);

          const languageDistribution: Record<string, number> = {};
          const gradeDistribution: Record<string, number> = {};

          learners.forEach((learner) => {
            const lang = learner.home_language || learner.HomeLanguage || learner.homeLanguage || 'Unknown';
            languageDistribution[lang] = (languageDistribution[lang] || 0) + 1;

            const gradeValue = learner.grade || learner.Grade || learner.grade_id || 'Unknown';
            const gradeLabel = typeof gradeValue === 'number' ? `Grade ${gradeValue}` : `Grade ${gradeValue}`;
            gradeDistribution[gradeLabel] = (gradeDistribution[gradeLabel] || 0) + 1;
          });

          const summary = {
            totals: {
              learners: learners.length,
              staff: staff.length,
              parents: parents.length,
            },
            languageDistribution,
            gradeDistribution,
            schoolInfo: {
              school_login_id: schoolLoginId,
              name: schoolName || schoolInfoResponse?.school_name || schoolInfoResponse?.SchoolName || 'Unknown',
              languages: Object.keys(languageDistribution).length,
            },
          };

          return `📊 **School Data Summary (D6)** - School: ${schoolName || schoolLoginId}\n\n${JSON.stringify(summary, null, 2)}`;
        } catch (error) {
          return `❌ D6 API error while building summary: ${formatD6Error(error)}`;
        }
      }

      const summaryData = generateComprehensiveMockData();
      const languageCounts = {};
      summaryData.learners.forEach(learner => {
        const lang = learner.HomeLanguage;
        languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      });
      const gradeCounts = {};
      summaryData.learners.forEach(learner => {
        const grade = `Grade ${learner.Grade}`;
        gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
      });
      const summary = {
        totals: {
          learners: summaryData.learners.length,
          staff: summaryData.staff.length,
          parents: summaryData.parents.length
        },
        languageDistribution: languageCounts,
        gradeDistribution: gradeCounts,
        schoolInfo: {
          name: ACTIVE_SCHOOL_PROFILE.school_name,
          grades: `${ACTIVE_SCHOOL_PROFILE.gradeRange.min}-${ACTIVE_SCHOOL_PROFILE.gradeRange.max}`,
          languages: ACTIVE_SCHOOL_PROFILE.languagesOffered?.length || Object.keys(languageCounts).length
        }
      };
      return `📊 **School Data Summary (${ACTIVE_SCHOOL_PROFILE.school_name})**\n\n${JSON.stringify(summary, null, 2)}\n\n✅ **Complete statistical overview for grades ${ACTIVE_SCHOOL_PROFILE.gradeRange.min}-${ACTIVE_SCHOOL_PROFILE.gradeRange.max}**`;
    }

    case 'd6_get_school_info': {
      if (mockMode) {
        return 'ℹ️ `d6_get_school_info` requires D6_MOCK_MODE=false to ensure real data.';
      }
      try {
        logToolInvocation('d6_get_school_info', mockMode, { school_login_id: schoolLoginId, school_name: schoolName });
        const data = await getSchoolInfoByLoginId(env, schoolLoginId, 'd6_get_school_info');
        return JSON.stringify(data, null, 2);
      } catch (error) {
        return `❌ D6 API error while fetching school info: ${formatD6Error(error)}`;
      }
    }

    case 'd6_get_learners': {
      if (mockMode) {
        return 'ℹ️ `d6_get_learners` requires D6_MOCK_MODE=false to ensure real data.';
      }
      const limit = Math.min(parseInt(args?.limit ?? '50', 10), 1000);
      const cursor = args?.cursor;
      try {
        logToolInvocation('d6_get_learners', mockMode, { school_login_id: schoolLoginId, school_name: schoolName, limit, cursor });
        const data = await getLearnersByLoginId(env, schoolLoginId, { limit, cursor }, 'd6_get_learners');
        return JSON.stringify(data, null, 2);
      } catch (error) {
        return `❌ D6 API error while fetching learners: ${formatD6Error(error)}`;
      }
    }

    case 'enable_d6_client': {
      if (mockMode) {
        return '⚠️ `enable_d6_client` should not be used in mock mode. This is a production admin operation.';
      }
      
      const targetSchoolId = Number(args?.school_login_id || args?.schoolId);
      const apiTypeId = Number(args?.api_type_id);
      const state = Number(args?.state ?? 1) as 0 | 1;
      
      if (!targetSchoolId || !apiTypeId) {
        return '❌ Missing required parameters: school_login_id and api_type_id are required';
      }
      
      try {
        assertSchoolAllowed(env, targetSchoolId);
        const targetSchoolName = getSchoolName(env, targetSchoolId);
        
        logToolInvocation('enable_d6_client', mockMode, { 
          school_login_id: targetSchoolId, 
          school_name: targetSchoolName,
          api_type_id: apiTypeId,
          state 
        });
        
        const result = await enableD6ClientIntegration(env, targetSchoolId, apiTypeId, state);
        
        // Handle empty responses (204 No Content) or null data
        const responseText = result 
          ? (typeof result === 'string' ? result : JSON.stringify(result, null, 2))
          : '(No content - successful 204 response)';
        
        return `✅ **D6 Client Integration ${state === 1 ? 'Enabled' : 'Disabled'}**\n\n` +
               `School: ${targetSchoolName || targetSchoolId}\n` +
               `API Type ID: ${apiTypeId}\n` +
               `State: ${state}\n\n` +
               `D6 Response: ${responseText}`;
      } catch (error) {
        return `❌ D6 API error while enabling client integration: ${formatD6Error(error)}`;
      }
    }

    case 'list_d6_schools': {
      const onlyActive = args?.only_active !== false; // default true
      const onlyWhitelisted = args?.only_whitelisted !== false; // default true

      try {
        // Fetch all clients from D6
        logToolInvocation('list_d6_schools', mockMode, { only_active: onlyActive, only_whitelisted: onlyWhitelisted });
        const clients = await getD6Clients(env);
        
        if (!Array.isArray(clients) || clients.length === 0) {
          return "ℹ️ No D6 clients were returned by /v1/settings/clients for this integrator account.";
        }

        // Derive whitelist from env
        const allowedIds = parseAllowedSchools(env);

        // Filter based on parameters
        const filtered = clients.filter((c: any) => {
          const id = Number(c.school_login_id);
          if (onlyActive && String(c.activated_by_integrator) !== "Yes") return false;
          if (onlyWhitelisted && allowedIds.length > 0 && !allowedIds.includes(id)) return false;
          return true;
        });

        if (filtered.length === 0) {
          return "ℹ️ No schools matched the filters (only_active / only_whitelisted). Try calling again with only_active=false or only_whitelisted=false if you want to see everything.";
        }

        // Build a compact summary (markdown table)
        const rows = filtered.map((c: any) => {
          const id = c.school_login_id;
          const name = c.school_name || 'Unknown';
          const apiType = c.api_type || 'Unknown';
          const active = c.activated_by_integrator || 'Unknown';
          return `| ${id} | ${name} | ${apiType} | ${active} |`;
        });

        const header = [
          "📚 **D6 Schools for Espen Integrator**",
          "",
          `Showing ${filtered.length} of ${clients.length} schools (only_active=${onlyActive}, only_whitelisted=${onlyWhitelisted})`,
          "",
          "| school_login_id | school_name | api_type | activated_by_integrator |",
          "|-----------------|-------------|----------|-------------------------|",
          ...rows
        ].join("\n");

        return header;
      } catch (error) {
        return `❌ D6 API error while fetching schools list: ${formatD6Error(error)}`;
      }
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// MCP Request Handler
async function handleMCPRequest(request: MCPRequest, env: EnvLike): Promise<MCPResponse> {
  // Production safeguard: prevent mock mode in production
  const mockMode = env.D6_MOCK_MODE === 'true';
  if ((env.NODE_ENV === 'production' || env.ESPEN_ENV === 'production') && mockMode) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: 'Mock mode is not allowed in production.',
      },
    };
  }

  switch (request.method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {
              listChanged: true
            },
          },
          serverInfo: {
            name: 'espen-d6-remote',
            version: '1.0.0',
          },
        },
      };

    case 'prompts/list':
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: { prompts: [] },
      };

    case 'resources/list':
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: { resources: [] },
      };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: MCP_TOOLS,
        },
      };

    case 'tools/call':
      const { name: toolName, arguments: args } = request.params;
      try {
        const result = await handleToolCall(toolName, args || {}, env);
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: result,
              },
            ],
          },
        };
      } catch (error) {
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal error',
          },
        };
      }

    default:
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32601,
          message: `Method not found: ${request.method}`,
        },
      };
  }
}

// Main HTTP handler for both Cloudflare and Vercel
export async function handleMcpRequest(request: Request, env: EnvLike): Promise<Response> {
  const url = new URL(request.url);

  // Health endpoint
  if (url.pathname === '/health') {
    return new Response(JSON.stringify({
      status: 'healthy',
      service: 'espen-d6-mcp-remote',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // SSE MCP endpoint
  if (url.pathname === '/sse') {
    if (request.method === 'HEAD') {
      return new Response(null, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
    if (request.method === 'GET') {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const encoder = new TextEncoder();
          const send = (obj: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
          const heartbeat = () => controller.enqueue(encoder.encode(`: heartbeat\n\n`));

          send({ jsonrpc: '2.0', method: 'connection', params: { status: 'connected' } });
          setTimeout(() => {
            send({ jsonrpc: '2.0', method: 'notifications/tools/list_changed', params: {} });
            send({ jsonrpc: '2.0', method: 'tools/list_changed', params: {} });
          }, 100);
          const intervalId = setInterval(heartbeat, 15000);

          const timeoutId = setTimeout(() => {
            clearInterval(intervalId as unknown as number);
            controller.close();
          }, 5 * 60 * 1000);

          // @ts-ignore
          const signal: AbortSignal | undefined = (request as any).signal;
          if (signal) {
            const onAbort = () => {
              clearInterval(intervalId as unknown as number);
              clearTimeout(timeoutId as unknown as number);
              controller.close();
            };
            signal.addEventListener('abort', onAbort, { once: true });
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
        },
      });
    }

    if (request.method === 'POST') {
      try {
        const mcpRequest: MCPRequest = await request.json();
        const mcpResponse = await handleMCPRequest(mcpRequest, env);
        
        return new Response(JSON.stringify(mcpResponse), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
            'Access-Control-Allow-Headers': 'Content-Type, Accept',
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32700,
            message: 'Parse error',
          },
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
      },
    });
  }

  return new Response('Espen D6 MCP Remote Server', {
    headers: { 'Content-Type': 'text/plain' },
  });
}

