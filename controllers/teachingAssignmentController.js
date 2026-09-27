const TeachingAssignment = require("../models/TeachingAssignment");
const Classroom = require("../models/Classroom");
const Subject = require("../models/Subject");
const User = require("../models/User");

// ======================================================
// GET CLASSROOM WHERE TEACHER IS CLASS TEACHER
// ======================================================

const getMyClassroom = async (teacherId) => {
  return await Classroom.findOne({
    classTeacher: teacherId,
  });
};

// ======================================================
// GET TEACHING ASSIGNMENTS
// ======================================================

exports.getTeachingAssignments = async (req, res) => {
  try {
    const teacherId = req.user._id;

    // --------------------------------------------------
    // CHECK CLASS TEACHER CLASSROOM
    // --------------------------------------------------

    const classTeacherClassroom =
      await getMyClassroom(teacherId);

    // --------------------------------------------------
    // GET ALL ASSIGNMENTS WHERE THIS TEACHER IS ASSIGNED
    // --------------------------------------------------

    const teacherAssignments =
      await TeachingAssignment.find({
        teacher: teacherId,
      })
        .populate("subject", "name code")
        .populate("teacher", "name email")
        .populate("classroom", "name section")
        .populate("assignedBy", "name");

    // --------------------------------------------------
    // GET CLASS TEACHER ASSIGNMENTS
    // --------------------------------------------------

    let classTeacherAssignments = [];

    if (classTeacherClassroom) {
      classTeacherAssignments =
        await TeachingAssignment.find({
          classroom: classTeacherClassroom._id,
        })
          .populate("subject", "name code")
          .populate("teacher", "name email")
          .populate("classroom", "name section")
          .populate("assignedBy", "name");
    }

    // --------------------------------------------------
    // COMBINE BOTH
    // --------------------------------------------------

    const allAssignments = [
      ...classTeacherAssignments,
      ...teacherAssignments,
    ];

    // Remove duplicates
    const uniqueAssignments = [];

    allAssignments.forEach((assignment) => {
      const alreadyExists =
        uniqueAssignments.some(
          (item) =>
            item._id.toString() ===
            assignment._id.toString()
        );

      if (!alreadyExists) {
        uniqueAssignments.push(assignment);
      }
    });

    // --------------------------------------------------
    // BUILD CLASSROOM LIST
    // --------------------------------------------------

    const classrooms = [];

    // Add Class Teacher classroom
    if (classTeacherClassroom) {
      classrooms.push({
        _id: classTeacherClassroom._id,
        name: classTeacherClassroom.name,
        section: classTeacherClassroom.section,
      });
    }

    // Add classrooms from subject assignments
    uniqueAssignments.forEach((assignment) => {
      if (!assignment.classroom) {
        return;
      }

      const alreadyExists =
        classrooms.some(
          (classroom) =>
            classroom._id.toString() ===
            assignment.classroom._id.toString()
        );

      if (!alreadyExists) {
        classrooms.push({
          _id: assignment.classroom._id,
          name: assignment.classroom.name,
          section: assignment.classroom.section,
        });
      }
    });

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    res.status(200).json({
      message:
        "Teaching assignments fetched successfully",

      isClassTeacher:
        !!classTeacherClassroom,

      classTeacherClassroom:
        classTeacherClassroom
          ? {
              _id: classTeacherClassroom._id,
              name: classTeacherClassroom.name,
              section:
                classTeacherClassroom.section,
            }
          : null,

      classrooms,

      data: uniqueAssignments,
    });

  } catch (error) {
    console.error(
      "GET TEACHING ASSIGNMENTS ERROR:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};

// ======================================================
// GET ALL TEACHERS
// ======================================================

exports.getAvailableTeachers = async (req, res) => {
  try {
    const teachers = await User.find({
      role: "teacher",
    })
      .select("name email phone")
      .sort({ name: 1 });

    res.status(200).json({
      message: "Teachers fetched successfully",
      data: teachers,
    });

  } catch (error) {
    console.error(
      "GET AVAILABLE TEACHERS ERROR:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};

// ======================================================
// ASSIGN TEACHER
// ======================================================

exports.assignTeacher = async (req, res) => {
  try {
    const { subject, teacher } = req.body;

    if (!subject || !teacher) {
      return res.status(400).json({
        message:
          "Subject and teacher are required",
      });
    }

    const classroom =
      await getMyClassroom(req.user._id);

    if (!classroom) {
      return res.status(403).json({
        message:
          "Only the Class Teacher can assign teachers",
      });
    }

    const subjectExists =
      await Subject.findById(subject);

    if (!subjectExists) {
      return res.status(404).json({
        message: "Subject not found",
      });
    }

    const teacherExists =
      await User.findOne({
        _id: teacher,
        role: "teacher",
      });

    if (!teacherExists) {
      return res.status(404).json({
        message: "Teacher not found",
      });
    }

    const existingAssignment =
      await TeachingAssignment.findOne({
        classroom: classroom._id,
        subject: subject,
      });

    if (existingAssignment) {
      return res.status(400).json({
        message:
          "This subject is already assigned to a teacher",
      });
    }

    const assignment =
      await TeachingAssignment.create({
        classroom: classroom._id,
        subject: subject,
        teacher: teacher,
        assignedBy: req.user._id,
      });

    const populatedAssignment =
      await TeachingAssignment.findById(
        assignment._id
      )
        .populate("subject", "name code")
        .populate("teacher", "name email")
        .populate("classroom", "name section")
        .populate("assignedBy", "name");

    res.status(201).json({
      message:
        "Teacher assigned successfully",
      data: populatedAssignment,
    });

  } catch (error) {
    console.error(
      "ASSIGN TEACHER ERROR:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};

// ======================================================
// CHANGE TEACHER
// ======================================================

exports.updateTeacherAssignment = async (
  req,
  res
) => {
  try {
    const { teacher } = req.body;

    if (!teacher) {
      return res.status(400).json({
        message: "Teacher is required",
      });
    }

    const classroom =
      await getMyClassroom(req.user._id);

    if (!classroom) {
      return res.status(403).json({
        message:
          "Only the Class Teacher can change assignments",
      });
    }

    const teacherExists =
      await User.findOne({
        _id: teacher,
        role: "teacher",
      });

    if (!teacherExists) {
      return res.status(404).json({
        message: "Teacher not found",
      });
    }

    const assignment =
      await TeachingAssignment.findOne({
        _id: req.params.id,
        classroom: classroom._id,
      });

    if (!assignment) {
      return res.status(404).json({
        message:
          "Teaching assignment not found",
      });
    }

    assignment.teacher = teacher;

    await assignment.save();

    const updatedAssignment =
      await TeachingAssignment.findById(
        assignment._id
      )
        .populate("subject", "name code")
        .populate("teacher", "name email")
        .populate("classroom", "name section")
        .populate("assignedBy", "name");

    res.status(200).json({
      message:
        "Teacher assignment updated successfully",
      data: updatedAssignment,
    });

  } catch (error) {
    console.error(
      "UPDATE TEACHER ASSIGNMENT ERROR:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};

// ======================================================
// DELETE TEACHER ASSIGNMENT
// ======================================================

exports.deleteTeacherAssignment = async (
  req,
  res
) => {
  try {
    const classroom =
      await getMyClassroom(req.user._id);

    if (!classroom) {
      return res.status(403).json({
        message:
          "Only the Class Teacher can remove assignments",
      });
    }

    const assignment =
      await TeachingAssignment.findOne({
        _id: req.params.id,
        classroom: classroom._id,
      });

    if (!assignment) {
      return res.status(404).json({
        message:
          "Teaching assignment not found",
      });
    }

    await TeachingAssignment.findByIdAndDelete(
      assignment._id
    );

    res.status(200).json({
      message:
        "Teacher assignment removed successfully",
    });

  } catch (error) {
    console.error(
      "DELETE TEACHER ASSIGNMENT ERROR:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};