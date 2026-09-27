const Submission = require("../models/Submission");
const Assignment = require("../models/Assignment");
const User = require("../models/User");
const Classroom = require("../models/Classroom");
const TeachingAssignment = require("../models/TeachingAssignment");

// ==========================================
// CHECK TEACHER ACCESS TO ASSIGNMENT
// ==========================================

const checkTeacherAssignmentAccess = async (
  teacherId,
  assignment
) => {
  // ------------------------------------------
  // CLASS TEACHER
  // ------------------------------------------

  const isClassTeacher =
    await Classroom.findOne({
      _id: assignment.classroom,
      classTeacher: teacherId,
    });

  if (isClassTeacher) {
    return true;
  }

  // ------------------------------------------
  // SUBJECT TEACHER
  // ------------------------------------------

  const subjectAssignment =
    await TeachingAssignment.findOne({
      teacher: teacherId,
      classroom: assignment.classroom,
      subject: assignment.subject,
    });

  return !!subjectAssignment;
};

// ==========================================
// SUBMIT ASSIGNMENT
// ==========================================

const submitAssignment = async (
  req,
  res,
  next
) => {
  try {
    const {
      assignmentId,
      content,
    } = req.body;

    // ------------------------------------------
    // VALIDATION
    // ------------------------------------------

    if (!assignmentId) {
      return res.status(400).json({
        message:
          "Assignment ID is required",
      });
    }

    if (
      !content?.trim() &&
      !req.file
    ) {
      return res.status(400).json({
        message:
          "Please enter an answer or upload a file",
      });
    }

    // ------------------------------------------
    // FIND ASSIGNMENT
    // ------------------------------------------

    const assignment =
      await Assignment.findById(
        assignmentId
      );

    if (!assignment) {
      return res.status(404).json({
        message:
          "Assignment not found",
      });
    }

    // ------------------------------------------
    // CHECK DUE DATE
    // ------------------------------------------

    if (
      new Date() >
      new Date(assignment.dueDate)
    ) {
      return res.status(400).json({
        message:
          "The submission deadline has passed.",
      });
    }

    // ------------------------------------------
    // CHECK STUDENT CLASSROOM
    // ------------------------------------------

    if (
      req.user.role === "student"
    ) {
      if (
        !req.user.classroom ||
        assignment.classroom.toString() !==
          req.user.classroom.toString()
      ) {
        return res.status(403).json({
          message:
            "You are not allowed to submit this assignment",
        });
      }
    }

    // ------------------------------------------
    // CHECK DUPLICATE SUBMISSION
    // ------------------------------------------

    const existingSubmission =
      await Submission.findOne({
        assignment: assignmentId,
        student: req.user._id,
      });

    if (existingSubmission) {
      return res.status(400).json({
        message:
          "You have already submitted this assignment",
      });
    }

    // ------------------------------------------
    // FILE
    // ------------------------------------------

    const attachmentUrl =
      req.file
        ? `/uploads/${req.file.filename}`
        : "";

    // ------------------------------------------
    // CREATE SUBMISSION
    // ------------------------------------------

    const submission =
      await Submission.create({
        assignment: assignmentId,
        student: req.user._id,
        content:
          content?.trim() || "",
        attachmentUrl,
      });

    // ------------------------------------------
    // POPULATE
    // ------------------------------------------

    const populatedSubmission =
      await Submission.findById(
        submission._id
      )
        .populate("assignment")
        .populate(
          "student",
          "name email rollNumber"
        );

    res.status(201).json({
      message:
        "Assignment submitted successfully",
      data: populatedSubmission,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET MY SUBMISSIONS
// ==========================================

const getMySubmissions = async (
  req,
  res,
  next
) => {
  try {
    const submissions =
      await Submission.find({
        student: req.user._id,
      })
        .populate("assignment")
        .sort({
          createdAt: -1,
        });

    res.status(200).json({
      message:
        "Submissions fetched successfully",
      data: submissions,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET SUBMISSIONS FOR ONE ASSIGNMENT
// ==========================================

const getAssignmentSubmissions = async (
  req,
  res,
  next
) => {
  try {
    const assignment =
      await Assignment.findById(
        req.params.assignmentId
      );

    if (!assignment) {
      return res.status(404).json({
        message:
          "Assignment not found",
      });
    }

    // ------------------------------------------
    // TEACHER ACCESS
    // ------------------------------------------

    if (
      req.user.role === "teacher"
    ) {
      const hasAccess =
        await checkTeacherAssignmentAccess(
          req.user._id,
          assignment
        );

      if (!hasAccess) {
        return res.status(403).json({
          message:
            "You are not allowed to view these submissions",
        });
      }
    }

    // ------------------------------------------
    // GET SUBMISSIONS
    // ------------------------------------------

    const submissions =
      await Submission.find({
        assignment:
          req.params.assignmentId,
      })
        .populate(
          "student",
          "name email rollNumber"
        )
        .populate("assignment");

    res.status(200).json({
      message:
        "Submissions fetched successfully",
      data: submissions,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET TEACHER PENDING SUBMISSIONS
// ==========================================

const getPendingSubmissions = async (
  req,
  res,
  next
) => {
  try {
    // ------------------------------------------
    // ONLY TEACHERS
    // ------------------------------------------

    if (
      req.user.role !== "teacher"
    ) {
      return res.status(403).json({
        message:
          "Only teachers can view pending submissions",
      });
    }

    // ------------------------------------------
    // CLASS TEACHER CLASSROOMS
    // ------------------------------------------

    const classTeacherClassrooms =
      await Classroom.find({
        classTeacher: req.user._id,
      }).select("_id");

    const classTeacherIds =
      classTeacherClassrooms.map(
        (classroom) =>
          classroom._id
      );

    // ------------------------------------------
    // SUBJECT TEACHER ASSIGNMENTS
    // ------------------------------------------

    const teachingAssignments =
      await TeachingAssignment.find({
        teacher: req.user._id,
      }).select(
        "classroom subject"
      );

    // ------------------------------------------
    // FIND ALLOWED ASSIGNMENTS
    // ------------------------------------------

    const allowedConditions = [];

    // Class Teacher:
    // all subjects in their classroom
    classTeacherIds.forEach(
      (classroomId) => {
        allowedConditions.push({
          classroom:
            classroomId,
        });
      }
    );

    // Subject Teacher:
    // only assigned classroom + subject
    teachingAssignments.forEach(
      (assignment) => {
        if (
          !assignment.classroom ||
          !assignment.subject
        ) {
          return;
        }

        allowedConditions.push({
          classroom:
            assignment.classroom,
          subject:
            assignment.subject,
        });
      }
    );

    if (
      allowedConditions.length === 0
    ) {
      return res.status(200).json({
        message:
          "No pending submissions",
        data: [],
        count: 0,
      });
    }

    // ------------------------------------------
    // FIND ASSIGNMENTS
    // ------------------------------------------

    const assignments =
      await Assignment.find({
        $or: allowedConditions,
      }).select(
        "_id title dueDate classroom subject"
      );

    const assignmentIds =
      assignments.map(
        (assignment) =>
          assignment._id
      );

    // ------------------------------------------
    // FIND PENDING SUBMISSIONS
    // ------------------------------------------

    const submissions =
      await Submission.find({
        assignment: {
          $in: assignmentIds,
        },
        score: {
          $exists: false,
        },
      })
        .populate(
          "student",
          "name email rollNumber"
        )
        .populate(
          "assignment",
          "title dueDate classroom subject"
        )
        .sort({
          submittedAt: -1,
        });

    res.status(200).json({
      message:
        "Pending submissions fetched successfully",
      data: submissions,
      count: submissions.length,
    });
  } catch (error) {
    console.error(
      "GET PENDING SUBMISSIONS ERROR:",
      error
    );

    next(error);
  }
};

// ==========================================
// GRADE SUBMISSION
// ==========================================

const gradeSubmission = async (
  req,
  res,
  next
) => {
  try {
    const {
      score,
      feedback,
    } = req.body;

    // ------------------------------------------
    // FIND SUBMISSION
    // ------------------------------------------

    const submission =
      await Submission.findById(
        req.params.id
      );

    if (!submission) {
      return res.status(404).json({
        message:
          "Submission not found",
      });
    }

    // ------------------------------------------
    // FIND ASSIGNMENT
    // ------------------------------------------

    const assignment =
      await Assignment.findById(
        submission.assignment
      );

    if (!assignment) {
      return res.status(404).json({
        message:
          "Assignment not found",
      });
    }

    // ------------------------------------------
    // TEACHER ACCESS
    // ------------------------------------------

    if (
      req.user.role === "teacher"
    ) {
      const hasAccess =
        await checkTeacherAssignmentAccess(
          req.user._id,
          assignment
        );

      if (!hasAccess) {
        return res.status(403).json({
          message:
            "You are not allowed to grade this submission",
        });
      }
    }

    // ------------------------------------------
    // SCORE
    // ------------------------------------------

    if (
      score !== undefined
    ) {
      if (
        score < 0
      ) {
        return res.status(400).json({
          message:
            "Score cannot be negative",
        });
      }

      submission.score =
        score;
    }

    // ------------------------------------------
    // FEEDBACK
    // ------------------------------------------

    if (
      feedback !== undefined
    ) {
      submission.feedback =
        feedback;
    }

    // ------------------------------------------
    // SAVE
    // ------------------------------------------

    await submission.save();

    // ------------------------------------------
    // GET UPDATED SUBMISSION
    // ------------------------------------------

    const updatedSubmission =
      await Submission.findById(
        submission._id
      )
        .populate(
          "student",
          "name email rollNumber"
        )
        .populate("assignment");

    res.status(200).json({
      message:
        "Submission graded successfully",
      data: updatedSubmission,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  submitAssignment,
  getMySubmissions,
  getAssignmentSubmissions,
  getPendingSubmissions,
  gradeSubmission,
};