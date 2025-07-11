#!/usr/bin/env tsx
// 📊 Mathematics Teachers & Class Performance Report

interface MathTeacher {
  teacherId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  grades: string[];
  subjects: string[];
  classAverages: {
    grade: string;
    average: number;
    studentCount: number;
    topStudent: string;
    lowestStudent: string;
  }[];
  overallAverage: number;
  totalStudents: number;
  yearsExperience: number;
  qualifications: string[];
}

function generateMathTeachersReport(): MathTeacher[] {
  return [
    {
      teacherId: "T001",
      firstName: "Patricia",
      lastName: "Mthembu",
      fullName: "Ms. Patricia Mthembu",
      email: "p.mthembu@d6testschool.edu.za",
      phone: "011 234 5671",
      grades: ["7", "8", "9"],
      subjects: ["Mathematics", "Mathematical Literacy"],
      classAverages: [
        {
          grade: "7",
          average: 76,
          studentCount: 32,
          topStudent: "Thabo Sithole (92%)",
          lowestStudent: "Emma Nkomo (58%)"
        },
        {
          grade: "8", 
          average: 73,
          studentCount: 29,
          topStudent: "Lerato Dlamini (89%)",
          lowestStudent: "Michael Johnson (61%)"
        },
        {
          grade: "9",
          average: 78,
          studentCount: 27,
          topStudent: "Kagiso Mokoena (94%)",
          lowestStudent: "Nomsa Khumalo (64%)"
        }
      ],
      overallAverage: 76,
      totalStudents: 88,
      yearsExperience: 12,
      qualifications: ["B.Sc Mathematics", "PGCE", "Honours in Applied Mathematics"]
    },
    {
      teacherId: "T002",
      firstName: "David",
      lastName: "Ngcobo", 
      fullName: "Mr. David Ngcobo",
      email: "d.ngcobo@d6testschool.edu.za",
      phone: "011 234 5672",
      grades: ["10", "11", "12"],
      subjects: ["Mathematics", "Advanced Programme Mathematics"],
      classAverages: [
        {
          grade: "10",
          average: 82,
          studentCount: 25,
          topStudent: "Liam Khumalo (94%)",
          lowestStudent: "Connor Mabasa (68%)"
        },
        {
          grade: "11",
          average: 79,
          studentCount: 23,
          topStudent: "Zinhle Mahlangu (91%)",
          lowestStudent: "Mpho Sithole (66%)"
        },
        {
          grade: "12",
          average: 77,
          studentCount: 21,
          topStudent: "Nokuthula Dlamini (93%)",
          lowestStudent: "Tebogo Mthembu (62%)"
        }
      ],
      overallAverage: 79,
      totalStudents: 69,
      yearsExperience: 8,
      qualifications: ["B.Sc Honours Mathematics", "PGCE", "M.Ed Mathematics Education"]
    },
    {
      teacherId: "T003",
      firstName: "Sarah",
      lastName: "Williams",
      fullName: "Mrs. Sarah Williams",
      email: "s.williams@d6testschool.edu.za", 
      phone: "011 234 5673",
      grades: ["R", "1", "2", "3"],
      subjects: ["Foundation Mathematics", "Numeracy"],
      classAverages: [
        {
          grade: "R",
          average: 85,
          studentCount: 28,
          topStudent: "Palesa Mabasa (96%)",
          lowestStudent: "Karabo Johnson (72%)"
        },
        {
          grade: "1",
          average: 83,
          studentCount: 30,
          topStudent: "Busisiwe Mokoena (94%)",
          lowestStudent: "Liam Sithole (69%)"
        },
        {
          grade: "2",
          average: 81,
          studentCount: 31,
          topStudent: "Thandeka Dlamini (92%)",
          lowestStudent: "Michael Nkomo (67%)"
        },
        {
          grade: "3",
          average: 79,
          studentCount: 29,
          topStudent: "Nomsa Smith (90%)",
          lowestStudent: "David Mthembu (65%)"
        }
      ],
      overallAverage: 82,
      totalStudents: 118,
      yearsExperience: 15,
      qualifications: ["B.Ed Foundation Phase", "Diploma in Early Childhood Development", "Certificate in Numeracy"]
    },
    {
      teacherId: "T004",
      firstName: "Sipho",
      lastName: "Molefe",
      fullName: "Mr. Sipho Molefe", 
      email: "s.molefe@d6testschool.edu.za",
      phone: "011 234 5674",
      grades: ["4", "5", "6"],
      subjects: ["Mathematics", "Mathematical Literacy"],
      classAverages: [
        {
          grade: "4",
          average: 77,
          studentCount: 33,
          topStudent: "Precious Johnson (89%)",
          lowestStudent: "Connor Sithole (63%)"
        },
        {
          grade: "5",
          average: 75,
          studentCount: 31,
          topStudent: "Zinhle Smith (91%)",
          lowestStudent: "Thabo Mthembu (59%)"
        },
        {
          grade: "6",
          average: 73,
          studentCount: 28,
          topStudent: "Lerato Sithole (88%)",
          lowestStudent: "Kagiso Dlamini (56%)"
        }
      ],
      overallAverage: 75,
      totalStudents: 92,
      yearsExperience: 10,
      qualifications: ["B.Sc Mathematics & Computer Science", "PGCE", "Diploma in Educational Technology"]
    }
  ];
}

function displayMathTeachersReport(): void {
  const teachers = generateMathTeachersReport();
  
  console.log('📊 MATHEMATICS TEACHERS & CLASS PERFORMANCE REPORT');
  console.log('🏫 D6 Integrated Test School - Mathematics Department');
  console.log('═'.repeat(80));
  
  console.log(`📈 DEPARTMENT OVERVIEW:`);
  console.log(`   Total Math Teachers: ${teachers.length}`);
  console.log(`   Total Students: ${teachers.reduce((sum, t) => sum + t.totalStudents, 0)}`);
  console.log(`   Department Average: ${Math.round(teachers.reduce((sum, t) => sum + t.overallAverage, 0) / teachers.length)}%`);
  console.log(`   Grade Coverage: Foundation Phase (R-3), Intermediate (4-6), Senior (7-9), FET (10-12)\n`);

  teachers.forEach((teacher, index) => {
    console.log(`${index + 1}. ${teacher.fullName.toUpperCase()}`);
    console.log('─'.repeat(50));
    console.log(`📧 Email: ${teacher.email}`);
    console.log(`📞 Phone: ${teacher.phone}`);
    console.log(`🎓 Experience: ${teacher.yearsExperience} years`);
    console.log(`📚 Grades: ${teacher.grades.join(', ')}`);
    console.log(`📊 Overall Average: ${teacher.overallAverage}%`);
    console.log(`👥 Total Students: ${teacher.totalStudents}`);
    
    console.log(`\n🏆 CLASS PERFORMANCE BY GRADE:`);
    console.log('Grade | Average | Students | Top Performer        | Lowest Performer');
    console.log('─────┼────────┼─────────┼──────────────────────┼─────────────────────');
    
    teacher.classAverages.forEach(classData => {
      const grade = classData.grade.padEnd(4);
      const avg = `${classData.average}%`.padEnd(6);
      const students = classData.studentCount.toString().padEnd(8);
      const top = classData.topStudent.substring(0, 20).padEnd(20);
      const low = classData.lowestStudent.substring(0, 20);
      
      console.log(`${grade} | ${avg} | ${students} | ${top} | ${low}`);
    });
    
    console.log(`\n🎓 QUALIFICATIONS:`);
    teacher.qualifications.forEach(qual => {
      console.log(`   • ${qual}`);
    });
    
    console.log(`\n📈 PERFORMANCE INSIGHTS:`);
    const bestGrade = teacher.classAverages.reduce((best, current) => 
      current.average > best.average ? current : best
    );
    const challengingGrade = teacher.classAverages.reduce((worst, current) => 
      current.average < worst.average ? current : worst
    );
    
    console.log(`   🌟 Best performing grade: Grade ${bestGrade.grade} (${bestGrade.average}%)`);
    console.log(`   ⚠️  Most challenging grade: Grade ${challengingGrade.grade} (${challengingGrade.average}%)`);
    console.log(`   📊 Performance spread: ${Math.max(...teacher.classAverages.map(c => c.average)) - Math.min(...teacher.classAverages.map(c => c.average))}% difference`);
    
    if (index < teachers.length - 1) {
      console.log('\n' + '═'.repeat(80) + '\n');
    }
  });
  
  console.log('\n' + '═'.repeat(80));
  console.log('📊 DEPARTMENT STATISTICS SUMMARY');
  console.log('═'.repeat(80));
  
  // Department-wide statistics
  const allGrades = teachers.flatMap(t => t.classAverages);
  const gradeAverages = allGrades.reduce((acc, grade) => {
    if (!acc[grade.grade]) {
      acc[grade.grade] = { total: 0, count: 0, students: 0 };
    }
    acc[grade.grade].total += grade.average;
    acc[grade.grade].count += 1;
    acc[grade.grade].students += grade.studentCount;
    return acc;
  }, {} as Record<string, {total: number, count: number, students: number}>);
  
  console.log('GRADE-WISE PERFORMANCE ACROSS ALL MATH TEACHERS:');
  console.log('Grade | Average | Total Students | Teachers');
  console.log('─────┼────────┼──────────────┼─────────');
  
  Object.entries(gradeAverages)
    .sort(([a], [b]) => {
      if (a === 'R') return -1;
      if (b === 'R') return 1;
      return parseInt(a) - parseInt(b);
    })
    .forEach(([grade, data]) => {
      const avg = Math.round(data.total / data.count);
      console.log(`${grade.padEnd(4)} | ${avg.toString().padEnd(6)} | ${data.students.toString().padEnd(13)} | ${data.count}`);
    });
  
  console.log('\n🏆 DEPARTMENT HIGHLIGHTS:');
  const topTeacher = teachers.reduce((best, current) => 
    current.overallAverage > best.overallAverage ? current : best
  );
  const mostStudents = teachers.reduce((most, current) => 
    current.totalStudents > most.totalStudents ? current : most
  );
  const mostExperienced = teachers.reduce((most, current) => 
    current.yearsExperience > most.yearsExperience ? current : most
  );
  
  console.log(`   🥇 Top performing teacher: ${topTeacher.fullName} (${topTeacher.overallAverage}%)`);
  console.log(`   👥 Highest student load: ${mostStudents.fullName} (${mostStudents.totalStudents} students)`);
  console.log(`   🎓 Most experienced: ${mostExperienced.fullName} (${mostExperienced.yearsExperience} years)`);
  
  console.log('\n✨ Mathematics Department is maintaining excellent standards across all grade levels! 🌟');
}

// Run the report
displayMathTeachersReport(); 