const Mark = require("../models/Mark");
const TeachingAssignment = require("../models/TeachingAssignment");
const Classroom = require("../models/Classroom");
const User = require("../models/User");
const { getTeacherClassroomIds, checkTeacherSubjectPermission } = require("../services/teacherService");

// ======================================================
// GET MARKS
// ======================================================

exports.getMarks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      examType,
      subjectId,
      studentId,
      classroomId,
    } = req.query;

    const query = {};

    // ==================================================
    // STUDENT
    // ==================================================

    if (req.user.role === "student") {
      // Student can see only their own marks
      query.student = req.user._id;

      if (subjectId) {
        query.subject = subjectId;
      }

      if (classroomId) {
        query.classroom = classroomId;
      }
    }

    // ==================================================
    // ADMIN
    // ==================================================

    else if (req.user.role === "admin") {
      if (classroomId) {
        query.classroom = classroomId;
      }

      if (subjectId) {
        query.subject = subjectId;
      }

      if (studentId) {
        query.student = studentId;
      }
    }

    // ==================================================
    // TEACHER
    // ==================================================

    else if (req.user.role === "teacher") {
      // ------------------------------------------------
      // Find Class Teacher classrooms
      // ------------------------------------------------

      const classTeacherClassrooms =
        await Classroom.find({
          classTeacher: req.user._id,
        }).select("_id");

      const classTeacherIds =
        classTeacherClassrooms.map(
          (classroom) => classroom._id.toString()
        );

      // ------------------------------------------------
      // Find Subject Teacher assignments
      // ------------------------------------------------

      const assignments =
        await TeachingAssignment.find({
          teacher: req.user._id,
        }).select("classroom subject");

      // ------------------------------------------------
      // CLASS TEACHER ACCESS
      // ------------------------------------------------

      let classTeacherAccess = false;

      if (classroomId) {
        classTeacherAccess =
          classTeacherIds.includes(
            classroomId.toString()
          );
      } else if (classTeacherIds.length > 0) {
        classTeacherAccess = true;
      }

      if (classTeacherAccess) {
        // ----------------------------------------------
        // Specific classroom
        // ----------------------------------------------

        if (classroomId) {
          query.classroom = classroomId;
        }

        // ----------------------------------------------
        // No classroom selected
        // ----------------------------------------------

        else {
          query.classroom = {
            $in: classTeacherIds,
          };
        }

        // ----------------------------------------------
        // Subject filter
        // ----------------------------------------------

        if (subjectId) {
          query.subject = subjectId;
        }

        // ----------------------------------------------
        // Student filter
        // ----------------------------------------------

        if (studentId) {
          query.student = studentId;
        }
      }

      // ------------------------------------------------
      // SUBJECT TEACHER ACCESS
      // ------------------------------------------------

      else {
        if (!assignments.length) {
          return res.status(200).json({
            data: [],
            pagination: {
              total: 0,
              page: Number(page),
              pages: 0,
            },
          });
        }

        // ----------------------------------------------
        // Classroom + Subject selected
        // ----------------------------------------------

        if (classroomId && subjectId) {
          const assignment =
            assignments.find(
              (item) =>
                item.classroom &&
                item.subject &&
                item.classroom.toString() ===
                  classroomId.toString() &&
                item.subject.toString() ===
                  subjectId.toString()
            );

          if (!assignment) {
            return res.status(403).json({
              message:
                "You are not assigned to this subject in this classroom",
            });
          }

          query.classroom = classroomId;
          query.subject = subjectId;
        }

        // ----------------------------------------------
        // Classroom selected
        // ----------------------------------------------

        else if (classroomId) {
          const classroomAssignments =
            assignments.filter(
              (item) =>
                item.classroom &&
                item.classroom.toString() ===
                  classroomId.toString()
            );

          if (!classroomAssignments.length) {
            return res.status(403).json({
              message:
                "You are not assigned to this classroom",
            });
          }

          // Keep classroom + subject relationship together
          query.$or =
            classroomAssignments.map(
              (item) => ({
                classroom: item.classroom,
                subject: item.subject,
              })
            );
        }

        // ----------------------------------------------
        // Subject selected
        // ----------------------------------------------

        else if (subjectId) {
          const subjectAssignments =
            assignments.filter(
              (item) =>
                item.subject &&
                item.subject.toString() ===
                  subjectId.toString()
            );

          if (!subjectAssignments.length) {
            return res.status(403).json({
              message:
                "You are not assigned to this subject",
            });
          }

          // Keep classroom + subject relationship together
          query.$or =
            subjectAssignments.map(
              (item) => ({
                classroom: item.classroom,
                subject: item.subject,
              })
            );
        }

        // ----------------------------------------------
        // Nothing selected
        // ----------------------------------------------

        else {
          // Show only the exact classroom + subject
          // combinations assigned to this teacher.

          query.$or =
            assignments.map(
              (item) => ({
                classroom: item.classroom,
                subject: item.subject,
              })
            );
        }

        // ----------------------------------------------
        // Student filter
        // ----------------------------------------------

        if (studentId) {
          query.student = studentId;
        }
      }
    }

    // ==================================================
    // EXAM TYPE
    // ==================================================

    if (examType) {
      query.examType = examType;
    }

    // ==================================================
    // PAGINATION
    // ==================================================

    const skip =
      (Number(page) - 1) *
      Number(limit);

    // ==================================================
    // TOTAL
    // ==================================================

    const total =
      await Mark.countDocuments(query);

    // ==================================================
    // GET MARKS
    // ==================================================

    const marks = await Mark.find(query)
      .populate(
        "student",
        "name rollNumber gender"
      )
      .populate(
        "subject",
        "name code"
      )
      .populate(
        "classroom",
        "name section"
      )
      .populate(
        "recordedBy",
        "name"
      )
      .sort({
        "student.name": 1,
        createdAt: -1,
      })
      .skip(skip)
      .limit(Number(limit));

    // ==================================================
    // RESPONSE
    // ==================================================

    res.status(200).json({
      data: marks,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(
          total / Number(limit)
        ),
      },
    });
  } catch (error) {
    console.error(
      "GET MARKS ERROR:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};

// ======================================================
// CREATE / RECORD MARK
// ======================================================

exports.createMark = async (req, res) => {
  try {
    const {
      student,
      subject,
      classroom,
      examType,
      marksObtained,
      maxMarks,
      remarks,
    } = req.body;

    // ==================================================
    // BASIC VALIDATION
    // ==================================================

    if (
      !student ||
      !subject ||
      !classroom ||
      !examType ||
      marksObtained === undefined ||
      !maxMarks
    ) {
      return res.status(400).json({
        message:
          "All required fields are required",
      });
    }

    // ==================================================
    // VALIDATE STUDENT + CLASSROOM
    // ==================================================

    const studentData = await User.findOne({
      _id: student,
      classroom: classroom,
      role: "student",
    });

    if (!studentData) {
      return res.status(400).json({
        message:
          "Selected student does not belong to this classroom",
      });
    }

    // ==================================================
    // ADMIN
    // ==================================================

    if (req.user.role === "admin") {
      // Admin is allowed
    }

    // ==================================================
    // TEACHER
    // ==================================================

    else if (req.user.role === "teacher") {
      const hasPermission = await checkTeacherSubjectPermission(
        req.user._id,
        classroom,
        subject
      );

      if (!hasPermission) {
        return res.status(403).json({
          message:
            "You are not assigned to this subject in this class",
        });
      }
    }

    // ==================================================
    // CREATE MARK
    // ==================================================

    const mark = new Mark({
      student,
      subject,
      classroom,
      examType,
      marksObtained,
      maxMarks,
      remarks,
      recordedBy: req.user._id,
    });

    // ==================================================
    // SAVE
    // ==================================================

    const saved = await mark.save();

    // ==================================================
    // POPULATE
    // ==================================================

    const populated =
      await saved.populate([
        {
          path: "student",
          select:
            "name rollNumber gender",
        },
        {
          path: "subject",
          select:
            "name code",
        },
        {
          path: "classroom",
          select:
            "name section",
        },
        {
          path: "recordedBy",
          select:
            "name",
        },
      ]);

    res.status(201).json(
      populated
    );
  } catch (error) {
    console.error(
      "CREATE MARK ERROR:",
      error
    );

    res.status(400).json({
      message: error.message,
    });
  }
};

// ======================================================
// UPDATE MARK
// ======================================================

exports.updateMark = async (
  req,
  res
) => {
  try {
    const {
      marksObtained,
      maxMarks,
      remarks,
      examType,
    } = req.body;

    // ==================================================
    // FIND MARK
    // ==================================================

    const mark =
      await Mark.findById(
        req.params.id
      );

    if (!mark) {
      return res.status(404).json({
        message:
          "Mark record not found",
      });
    }

    // ==================================================
    // ADMIN
    // ==================================================

    if (req.user.role === "admin") {
      // Admin allowed
    }

    // ==================================================
    // TEACHER
    // ==================================================

    else if (
      req.user.role === "teacher"
    ) {
      const hasPermission = await checkTeacherSubjectPermission(
        req.user._id,
        mark.classroom,
        mark.subject
      );

      if (!hasPermission) {
        return res.status(403).json({
          message:
            "You are not assigned to this subject",
        });
      }
    }

    // ==================================================
    // UPDATE
    // ==================================================

    if (
      marksObtained !==
      undefined
    ) {
      mark.marksObtained =
        marksObtained;
    }

    if (
      maxMarks !==
      undefined
    ) {
      mark.maxMarks =
        maxMarks;
    }

    if (
      remarks !==
      undefined
    ) {
      mark.remarks =
        remarks;
    }

    if (examType) {
      mark.examType =
        examType;
    }

    // ==================================================
    // SAVE
    // ==================================================

    const updated =
      await mark.save();

    // ==================================================
    // POPULATE
    // ==================================================

    const populated =
      await updated.populate([
        {
          path: "student",
          select:
            "name rollNumber gender",
        },
        {
          path: "subject",
          select:
            "name code",
        },
        {
          path: "classroom",
          select:
            "name section",
        },
        {
          path: "recordedBy",
          select:
            "name",
        },
      ]);

    res.status(200).json(
      populated
    );
  } catch (error) {
    console.error(
      "UPDATE MARK ERROR:",
      error
    );

    res.status(400).json({
      message: error.message,
    });
  }
};

// ======================================================
// DELETE MARK
// ======================================================

exports.deleteMark = async (
  req,
  res
) => {
  try {
    // ==================================================
    // FIND MARK
    // ==================================================

    const mark =
      await Mark.findById(
        req.params.id
      );

    if (!mark) {
      return res.status(404).json({
        message:
          "Record not found",
      });
    }

    // ==================================================
    // ADMIN
    // ==================================================

    if (
      req.user.role === "admin"
    ) {
      await Mark.findByIdAndDelete(
        mark._id
      );

      return res.status(200).json({
        message:
          "Mark record deleted successfully",
      });
    }

    // ==================================================
    // TEACHER
    // ==================================================

    if (
      req.user.role === "teacher"
    ) {
      const hasPermission = await checkTeacherSubjectPermission(
        req.user._id,
        mark.classroom,
        mark.subject
      );

      if (!hasPermission) {
        return res.status(403).json({
          message:
            "You are not assigned to this subject",
        });
      }

      await Mark.findByIdAndDelete(mark._id);

      return res.status(200).json({
        message: "Mark record deleted successfully",
      });
    }

    // ==================================================
    // NOT AUTHORIZED
    // ==================================================

    return res.status(403).json({
      message:
        "Not authorized",
    });
  } catch (error) {
    console.error(
      "DELETE MARK ERROR:",
      error
    );

    res.status(500).json({
      message:
        error.message,
    });
  }
};