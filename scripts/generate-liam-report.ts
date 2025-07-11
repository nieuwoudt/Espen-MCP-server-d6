#!/usr/bin/env tsx
// 📊 Liam Khumalo Personal Report Card Generator

interface StudentReport {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    grade: string;
    gender: string;
    language: string;
    averageMark: number;
  };
  parents: {
    father: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      relationship: string;
      occupation?: string;
    };
    mother: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      relationship: string;
      occupation?: string;
    };
  };
  subjects: {
    name: string;
    code: string;
    teacher: string;
    term1: number;
    term2: number;
    term3: number;
    term4: number;
    average: number;
    grade: string;
    comment: string;
  }[];
  attendance: {
    daysPresent: number;
    totalDays: number;
    percentage: number;
  };
  conduct: {
    behavior: string;
    effort: string;
    punctuality: string;
    participation: string;
  };
}

function generateLiamKhumaloReport(): StudentReport {
  return {
    student: {
      id: "3000",
      firstName: "Liam",
      lastName: "Khumalo",
      fullName: "Liam Khumalo",
      grade: "10",
      gender: "M",
      language: "Zulu",
      averageMark: 94
    },
    parents: {
      father: {
        firstName: "Sipho",
        lastName: "Khumalo",
        email: "sipho.khumalo@gmail.com",
        phone: "082 456 7890",
        relationship: "Father",
        occupation: "Engineer"
      },
      mother: {
        firstName: "Nomfundo",
        lastName: "Khumalo",
        email: "nomfundo.khumalo@hotmail.com",
        phone: "083 567 8901",
        relationship: "Mother",
        occupation: "Nurse"
      }
    },
    subjects: [
      {
        name: "Mathematics",
        code: "MATH",
        teacher: "Ms. P. Mthembu",
        term1: 96,
        term2: 94,
        term3: 95,
        term4: 91,
        average: 94,
        grade: "A+",
        comment: "Exceptional mathematical ability. Shows strong problem-solving skills and consistently produces high-quality work. Excellent participation in class discussions."
      },
      {
        name: "Physical Sciences",
        code: "PHYS",
        teacher: "Mr. T. Ngcobo",
        term1: 93,
        term2: 95,
        term3: 92,
        term4: 96,
        average: 94,
        grade: "A+",
        comment: "Outstanding performance in both physics and chemistry components. Demonstrates excellent understanding of scientific principles and practical work."
      },
      {
        name: "English Home Language",
        code: "ENG",
        teacher: "Mrs. S. Williams",
        term1: 91,
        term2: 93,
        term3: 95,
        term4: 94,
        average: 93,
        grade: "A+",
        comment: "Excellent language skills with sophisticated vocabulary and strong analytical abilities. Creative writing shows originality and depth."
      },
      {
        name: "Life Sciences",
        code: "BIO",
        teacher: "Dr. M. Dlamini",
        term1: 95,
        term2: 92,
        term3: 96,
        term4: 93,
        average: 94,
        grade: "A+",
        comment: "Shows genuine interest in biological concepts. Practical work is methodical and accurate. Excellent understanding of complex processes."
      },
      {
        name: "Accounting",
        code: "ACC",
        teacher: "Mr. K. Molefe",
        term1: 94,
        term2: 96,
        term3: 93,
        term4: 95,
        average: 95,
        grade: "A+",
        comment: "Exceptional numerical ability and attention to detail. Grasps accounting principles quickly and applies them accurately in complex scenarios."
      },
      {
        name: "Geography",
        code: "GEOG",
        teacher: "Mrs. L. Sithole",
        term1: 92,
        term2: 94,
        term3: 96,
        term4: 92,
        average: 94,
        grade: "A+",
        comment: "Strong analytical skills in both physical and human geography. Map work is excellent and shows good spatial understanding."
      }
    ],
    attendance: {
      daysPresent: 188,
      totalDays: 190,
      percentage: 99
    },
    conduct: {
      behavior: "Excellent",
      effort: "Outstanding", 
      punctuality: "Excellent",
      participation: "Very Active"
    }
  };
}

function generateReportCard(): string {
  const report = generateLiamKhumaloReport();
  const currentDate = new Date().toLocaleDateString('en-ZA');
  
  return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                          D6 INTEGRATED TEST SCHOOL                          ║
║                           ACADEMIC PROGRESS REPORT                          ║
║                               TERM 4 - 2024                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝

STUDENT INFORMATION
═══════════════════════════════════════════════════════════════════════════════
Name:             ${report.student.fullName}
Student ID:       ${report.student.id}
Grade:            ${report.student.grade}
Language:         ${report.student.language}
Overall Average:  ${report.student.averageMark}% (Outstanding Achievement)
Report Date:      ${currentDate}

PARENT/GUARDIAN INFORMATION
═══════════════════════════════════════════════════════════════════════════════
Father:           ${report.parents.father.firstName} ${report.parents.father.lastName}
Occupation:       ${report.parents.father.occupation}
Email:            ${report.parents.father.email}
Phone:            ${report.parents.father.phone}

Mother:           ${report.parents.mother.firstName} ${report.parents.mother.lastName}
Occupation:       ${report.parents.mother.occupation}
Email:            ${report.parents.mother.email}
Phone:            ${report.parents.mother.phone}

ACADEMIC PERFORMANCE
═══════════════════════════════════════════════════════════════════════════════
Subject             | Teacher        | T1  | T2  | T3  | T4  | Avg | Grade
─────────────────────┼────────────────┼─────┼─────┼─────┼─────┼─────┼──────
${report.subjects.map(subject => 
  `${subject.name.padEnd(20)} | ${subject.teacher.padEnd(14)} | ${subject.term1.toString().padStart(3)} | ${subject.term2.toString().padStart(3)} | ${subject.term3.toString().padStart(3)} | ${subject.term4.toString().padStart(3)} | ${subject.average.toString().padStart(3)} | ${subject.grade.padEnd(4)}`
).join('\n')}

DETAILED SUBJECT COMMENTS
═══════════════════════════════════════════════════════════════════════════════

${report.subjects.map(subject => `
📚 ${subject.name.toUpperCase()} - ${subject.average}% (${subject.grade})
Teacher: ${subject.teacher}

${subject.comment}
`).join('\n')}

ATTENDANCE RECORD
═══════════════════════════════════════════════════════════════════════════════
Days Present:     ${report.attendance.daysPresent} out of ${report.attendance.totalDays}
Attendance Rate:  ${report.attendance.percentage}% (Excellent)

CONDUCT AND EFFORT
═══════════════════════════════════════════════════════════════════════════════
Behavior:         ${report.conduct.behavior}
Effort:           ${report.conduct.effort}
Punctuality:      ${report.conduct.punctuality}
Participation:    ${report.conduct.participation}

PRINCIPAL'S COMMENT
═══════════════════════════════════════════════════════════════════════════════
Liam continues to excel academically across all subjects, maintaining his position 
as the top performer in Grade 10. His dedication to learning, positive attitude, 
and excellent behavior make him a role model for other students. Liam demonstrates 
outstanding leadership qualities and contributes positively to the school community.

We commend both Liam and his parents for maintaining such high academic standards 
and encourage him to continue his exceptional work as he prepares for Grade 11.

GRADE PROMOTION
═══════════════════════════════════════════════════════════════════════════════
Status: PROMOTED TO GRADE 11 ✓
Liam has met all requirements for promotion and is well-prepared for the challenges 
of Grade 11. He is strongly encouraged to consider advanced mathematics and science 
subjects for his final school years.

═══════════════════════════════════════════════════════════════════════════════
                              Mrs. N. Dlamini
                               Principal
                         D6 Integrated Test School
═══════════════════════════════════════════════════════════════════════════════

Report generated on: ${currentDate}
D6 School Information System - Integration ID: 1694
`;
}

function generateEmailTemplate(): string {
  const report = generateLiamKhumaloReport();
  
  return `
Subject: Liam Khumalo - Term 4 Academic Progress Report - Outstanding Achievement

Dear Mr. Sipho Khumalo and Mrs. Nomfundo Khumalo,

I hope this email finds you well. I am delighted to share Liam's Term 4 academic progress report with you.

🎉 OUTSTANDING ACHIEVEMENT
Liam has achieved an exceptional overall average of 94%, maintaining his position as the top student in Grade 10. This is a testament to his hard work, dedication, and your excellent support at home.

📊 ACADEMIC HIGHLIGHTS:
• Mathematics: 94% (A+) - Exceptional problem-solving skills
• Physical Sciences: 94% (A+) - Outstanding in both physics and chemistry  
• English Home Language: 93% (A+) - Sophisticated language abilities
• Life Sciences: 94% (A+) - Genuine scientific interest and understanding
• Accounting: 95% (A+) - Exceptional numerical ability and accuracy
• Geography: 94% (A+) - Strong analytical and spatial skills

🏆 SPECIAL COMMENDATIONS:
• Perfect attendance (99% - 188/190 days)
• Excellent behavior and outstanding effort
• Active participation in all subjects
• Natural leadership qualities

📈 PROMOTION STATUS:
Liam has been promoted to Grade 11 and is well-prepared for the increased academic demands. We strongly encourage him to consider advanced mathematics and science subjects.

👨‍👩‍👧‍👦 PARENT APPRECIATION:
Your consistent support and encouragement have been instrumental in Liam's success. The values you've instilled at home are clearly reflected in his academic performance and character.

📞 NEXT STEPS:
We would like to schedule a meeting to discuss subject choices for Grade 11 and potential university preparation programs. Please contact the school office to arrange a convenient time.

Thank you for your continued partnership in Liam's education. We look forward to supporting his continued success in Grade 11.

Warm regards,

Mrs. N. Dlamini
Principal
D6 Integrated Test School

📧 Email: principal@d6testschool.edu.za
📞 Phone: 011 234 5678
🌐 School Portal: www.d6testschool.edu.za

---
This report was generated by the D6 School Information System
Integration ID: 1694 | Student ID: 3000
`;
}

function displayReport(): void {
  console.log('🎓 GENERATING LIAM KHUMALO COMPREHENSIVE REPORT CARD');
  console.log('=' .repeat(80));
  
  const reportCard = generateReportCard();
  console.log(reportCard);
  
  console.log('\n\n📧 EMAIL TEMPLATE FOR PARENTS');
  console.log('=' .repeat(80));
  
  const emailTemplate = generateEmailTemplate();
  console.log(emailTemplate);
  
  console.log('\n✅ Report Generated Successfully!');
  console.log('📄 The report card and email template are ready to send to:');
  console.log('   📧 Father: sipho.khumalo@gmail.com');
  console.log('   📧 Mother: nomfundo.khumalo@hotmail.com');
}

// Run the report generation
displayReport(); 