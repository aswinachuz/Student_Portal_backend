const Classroom = require("../models/Classroom");
const TeachingAssignment = require("../models/TeachingAssignment");

/**
 * Get all classroom IDs that a teacher is assigned to,
 * either as a Class Teacher or a Subject Teacher.
 * 
 * @param {string} teacherId - The ID of the teacher
 * @returns {Promise<Array>} Array of classroom ObjectIds
 */
const getTeacherClassroomIds = async (teacherId) => {
  const classroomIds = [];

  // Classroom where teacher is the Class Teacher
  const classTeacherClass = await Classroom.findOne({
    classTeacher: teacherId,
  }).select("_id");

  if (classTeacherClass) {
    classroomIds.push(classTeacherClass._id);
  }

  // Classrooms where teacher is a Subject Teacher
  const teachingAssignments = await TeachingAssignment.find({
    teacher: teacherId,
  }).select("classroom");

  teachingAssignments.forEach((assignment) => {
    if (!assignment.classroom) return;

    const alreadyExists = classroomIds.some(
      (id) => id.toString() === assignment.classroom.toString()
    );

    if (!alreadyExists) {
      classroomIds.push(assignment.classroom);
    }
  });

  return classroomIds;
};

/**
 * Check if a teacher has permission for a specific classroom and subject.
 * True if they are the Class Teacher for the classroom, OR if they are 
 * a Subject Teacher assigned to that specific subject in that classroom.
 * 
 * @param {string} teacherId - The ID of the teacher
 * @param {string} classroomId - The ID of the classroom
 * @param {string} subjectId - The ID of the subject
 * @returns {Promise<boolean>} True if permitted, false otherwise
 */
const checkTeacherSubjectPermission = async (teacherId, classroomId, subjectId) => {
  const isClassTeacher = await Classroom.findOne({
    _id: classroomId,
    classTeacher: teacherId,
  });

  if (isClassTeacher) {
    return true;
  }

  if (!subjectId) {
    return false;
  }

  const subjectAssignment = await TeachingAssignment.findOne({
    teacher: teacherId,
    classroom: classroomId,
    subject: subjectId,
  });

  return !!subjectAssignment;
};

module.exports = {
  getTeacherClassroomIds,
  checkTeacherSubjectPermission,
};
