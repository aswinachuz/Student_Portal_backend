const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const Classroom = require("../models/Classroom");
const TeachingAssignment = require("../models/TeachingAssignment");
const fs = require("fs");
const path = require("path");
const { checkTeacherSubjectPermission } = require("../services/teacherService");

// ======================================================
// GET ALL ASSIGNMENTS
// ======================================================
exports.getAssignments = async (req, res) => {
  try {
    const { classroomId, subjectId } = req.query;

    // ==================================================
    // STUDENT
    // ==================================================
    if (req.user.role === "student") {
      const query = {};

      if (req.user.classroom) {
        query.classroom = req.user.classroom;
      }

      if (subjectId) {
        query.subject = subjectId;
      }

      const assignments = await Assignment.find(query)
        .populate("subject", "name code")
        .populate("classroom", "name section")
        .populate("createdBy", "name")
        .sort({ dueDate: 1 });

      return res.json(assignments);
    }

    // ==================================================
    // ADMIN
    // ==================================================
    if (req.user.role === "admin") {
      const query = {};

      if (classroomId) {
        query.classroom = classroomId;
      }

      if (subjectId) {
        query.subject = subjectId;
      }

      const assignments = await Assignment.find(query)
        .populate("subject", "name code")
        .populate("classroom", "name section")
        .populate("createdBy", "name")
        .sort({ dueDate: 1 });

      return res.json(assignments);
    }

    // ==================================================
    // TEACHER
    // ==================================================
    if (req.user.role === "teacher") {
      // -----------------------------------------------
      // CLASSROOMS WHERE TEACHER IS CLASS TEACHER
      // -----------------------------------------------
      const classTeacherClassrooms = await Classroom.find({
        classTeacher: req.user._id,
      }).select("_id");

      const classTeacherIds = classTeacherClassrooms.map(
        (classroom) => classroom._id.toString()
      );

      // -----------------------------------------------
      // SUBJECT TEACHER ASSIGNMENTS
      // -----------------------------------------------
      const teachingAssignments = await TeachingAssignment.find({
        teacher: req.user._id,
      }).select("classroom subject");

      // -----------------------------------------------
      // BUILD ALLOWED ASSIGNMENTS
      // -----------------------------------------------
      const allowedConditions = [];

      // Class Teacher:
      // Can see ALL subjects in their classroom.
      classTeacherIds.forEach((id) => {
        allowedConditions.push({
          classroom: id,
        });
      });

      // Subject Teacher:
      // Can see ONLY their assigned subject in their assigned classroom.
      teachingAssignments.forEach((assignment) => {
        if (!assignment.classroom || !assignment.subject) {
          return;
        }

        allowedConditions.push({
          classroom: assignment.classroom,
          subject: assignment.subject,
        });
      });

      // Teacher has no class or subject assignment
      if (allowedConditions.length === 0) {
        return res.json([]);
      }

      // -----------------------------------------------
      // APPLY REQUESTED FILTERS
      // -----------------------------------------------
      let query;

      if (classroomId && subjectId) {
        // Specific classroom + subject
        const allowed = allowedConditions.some((condition) => {
          const conditionClassroom =
            condition.classroom?.toString();

          const conditionSubject =
            condition.subject?.toString();

          // Class Teacher condition
          if (
            conditionClassroom === classroomId &&
            !conditionSubject
          ) {
            return true;
          }

          // Subject Teacher condition
          return (
            conditionClassroom === classroomId &&
            conditionSubject === subjectId
          );
        });

        if (!allowed) {
          return res.status(403).json({
            message:
              "You are not assigned to this subject in this classroom",
          });
        }

        query = {
          classroom: classroomId,
          subject: subjectId,
        };
      } else if (classroomId) {
        // Specific classroom
        const classroomConditions = allowedConditions.filter(
          (condition) =>
            condition.classroom?.toString() === classroomId
        );

        if (classroomConditions.length === 0) {
          return res.status(403).json({
            message:
              "You are not assigned to this classroom",
          });
        }

        // Class Teacher
        const isClassTeacher = classroomConditions.some(
          (condition) => !condition.subject
        );

        if (isClassTeacher) {
          query = {
            classroom: classroomId,
          };
        } else {
          // Subject Teacher
          query = {
            $or: classroomConditions.map((condition) => ({
              classroom: condition.classroom,
              subject: condition.subject,
            })),
          };
        }
      } else if (subjectId) {
        // Specific subject
        const matchingConditions = allowedConditions.filter(
          (condition) =>
            !condition.subject ||
            condition.subject.toString() === subjectId
        );

        if (matchingConditions.length === 0) {
          return res.status(403).json({
            message:
              "You are not assigned to this subject",
          });
        }

        query = {
          $or: matchingConditions.map((condition) => {
            if (!condition.subject) {
              return {
                classroom: condition.classroom,
                subject: subjectId,
              };
            }

            return {
              classroom: condition.classroom,
              subject: condition.subject,
            };
          }),
        };
      } else {
        // No filters
        // Return only assignments teacher is allowed to see.
        query = {
          $or: allowedConditions,
        };
      }

      const assignments = await Assignment.find(query)
        .populate("subject", "name code")
        .populate("classroom", "name section")
        .populate("createdBy", "name")
        .sort({ dueDate: 1 });

      return res.json(assignments);
    }

    return res.status(403).json({
      message: "You are not allowed to view assignments",
    });
  } catch (error) {
    console.error("GET ASSIGNMENTS ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// ======================================================
// GET SINGLE ASSIGNMENT
// ======================================================
exports.getAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate("subject", "name code")
      .populate("classroom", "name section")
      .populate("createdBy", "name");

    if (!assignment) {
      return res.status(404).json({
        message: "Assignment not found",
      });
    }

    // -----------------------------------------------
    // STUDENT
    // -----------------------------------------------
    if (req.user.role === "student") {
      if (
        !req.user.classroom ||
        assignment.classroom._id.toString() !==
          req.user.classroom.toString()
      ) {
        return res.status(403).json({
          message: "You are not allowed to view this assignment",
        });
      }
    }

    // -----------------------------------------------
    // TEACHER
    // -----------------------------------------------
    if (req.user.role === "teacher") {
      const hasPermission = await checkTeacherSubjectPermission(
        req.user._id,
        assignment.classroom._id,
        assignment.subject._id
      );

      if (!hasPermission) {
        return res.status(403).json({
          message:
            "You are not assigned to this subject in this classroom",
        });
      }
    }

    res.json(assignment);
  } catch (error) {
    console.error("GET ASSIGNMENT ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// ======================================================
// CREATE ASSIGNMENT
// ======================================================
exports.createAssignment = async (req, res) => {
  try {
    const {
      title,
      description,
      subject,
      classroom,
      dueDate,
    } = req.body;

    if (!title || !description || !subject || !classroom || !dueDate) {
      return res.status(400).json({
        message: "All assignment fields are required",
      });
    }

    // -----------------------------------------------
    // TEACHER PERMISSION
    // -----------------------------------------------
    if (req.user.role === "teacher") {
      const hasPermission = await checkTeacherSubjectPermission(
        req.user._id,
        classroom,
        subject
      );

      if (!hasPermission) {
        return res.status(403).json({
          message:
            "You are not assigned to this subject in this classroom",
        });
      }
    }

    const assignment = new Assignment({
      title,
      description,
      subject,
      classroom,
      dueDate,
      createdBy: req.user._id,
    });

    const savedAssignment = await assignment.save();

    const populatedAssignment =
      await savedAssignment.populate([
        {
          path: "subject",
          select: "name code",
        },
        {
          path: "classroom",
          select: "name section",
        },
        {
          path: "createdBy",
          select: "name",
        },
      ]);

    res.status(201).json(populatedAssignment);
  } catch (error) {
    console.error("CREATE ASSIGNMENT ERROR:", error);

    res.status(400).json({
      message: error.message,
    });
  }
};

// ======================================================
// UPDATE ASSIGNMENT
// ======================================================
exports.updateAssignment = async (req, res) => {
  try {
    const {
      title,
      description,
      subject,
      classroom,
      dueDate,
    } = req.body;

    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        message: "Assignment not found",
      });
    }

    // -----------------------------------------------
    // TEACHER PERMISSION
    // -----------------------------------------------
    if (req.user.role === "teacher") {
      const hasPermission = await checkTeacherSubjectPermission(
        req.user._id,
        assignment.classroom,
        assignment.subject
      );

      // Subject Teacher must own the assignment
      const isClassTeacher = await Classroom.findOne({
        _id: assignment.classroom,
        classTeacher: req.user._id,
      });

      if (!isClassTeacher && assignment.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: "You are not allowed to update this assignment",
        });
      }

      if (!hasPermission) {
        return res.status(403).json({
          message: "You are not assigned to this subject in this classroom",
        });
      }

      // If teacher is changing classroom/subject,
      // verify the new combination too.
      const newClassroom = classroom || assignment.classroom;
      const newSubject = subject || assignment.subject;

      const hasNewPermission = await checkTeacherSubjectPermission(
        req.user._id,
        newClassroom,
        newSubject
      );

      if (!hasNewPermission) {
        return res.status(403).json({
          message: "You are not assigned to the new subject/classroom",
        });
      }
    }

    if (title !== undefined) {
      assignment.title = title;
    }

    if (description !== undefined) {
      assignment.description = description;
    }

    if (subject !== undefined) {
      assignment.subject = subject;
    }

    if (classroom !== undefined) {
      assignment.classroom = classroom;
    }

    if (dueDate !== undefined) {
      assignment.dueDate = dueDate;
    }

    const updatedAssignment = await assignment.save();

    const populatedAssignment =
      await updatedAssignment.populate([
        {
          path: "subject",
          select: "name code",
        },
        {
          path: "classroom",
          select: "name section",
        },
        {
          path: "createdBy",
          select: "name",
        },
      ]);

    res.json(populatedAssignment);
  } catch (error) {
    console.error("UPDATE ASSIGNMENT ERROR:", error);

    res.status(400).json({
      message: error.message,
    });
  }
};

// ======================================================
// DELETE ASSIGNMENT
// ======================================================
exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        message: "Assignment not found",
      });
    }

    // -----------------------------------------------
    // TEACHER PERMISSION
    // -----------------------------------------------
    if (req.user.role === "teacher") {
      const hasPermission = await checkTeacherSubjectPermission(
        req.user._id,
        assignment.classroom,
        assignment.subject
      );

      // Subject teacher can delete only their own assignment
      const isClassTeacher = await Classroom.findOne({
        _id: assignment.classroom,
        classTeacher: req.user._id,
      });

      if (!isClassTeacher && assignment.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: "You are not allowed to delete this assignment",
        });
      }

      if (!hasPermission) {
        return res.status(403).json({
          message: "You are not assigned to this subject in this classroom",
        });
      }
    }

    // Find all submissions for this assignment to clean up uploaded files
    const submissions = await Submission.find({ assignment: assignment._id });
    for (const sub of submissions) {
      if (sub.attachmentUrl) {
        const filePath = path.join(__dirname, "..", sub.attachmentUrl);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (unlinkErr) {
            console.error("Error removing submission file:", unlinkErr.message);
          }
        }
      }
    }

    // Delete all submissions associated with this assignment
    await Submission.deleteMany({ assignment: assignment._id });

    // Delete the assignment itself
    await assignment.deleteOne();

    res.json({
      message: "Assignment deleted successfully",
    });
  } catch (error) {
    console.error("DELETE ASSIGNMENT ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};