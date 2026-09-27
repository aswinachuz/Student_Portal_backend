const Attendance = require("../models/Attendance");
const Classroom = require("../models/Classroom");
const User = require("../models/User");

// ==========================================
// RECORD BATCH ATTENDANCE
// ==========================================
exports.recordBatchAttendance = async (req, res) => {
  try {
    const {
      classroomId,
      date,
      attendanceRecords,
    } = req.body;

    // ------------------------------------------
    // BASIC VALIDATION
    // ------------------------------------------

    if (
      !classroomId ||
      !date ||
      !Array.isArray(attendanceRecords) ||
      attendanceRecords.length === 0
    ) {
      return res.status(400).json({
        message:
          "Classroom, date and attendance records are required.",
      });
    }

    // ------------------------------------------
    // CHECK CLASSROOM
    // ------------------------------------------

    const classroom =
      await Classroom.findById(classroomId);

    if (!classroom) {
      return res.status(404).json({
        message: "Classroom not found.",
      });
    }

    // ------------------------------------------
    // TEACHER CAN ONLY MARK THEIR CLASS
    // ------------------------------------------

    if (req.user.role === "teacher") {
      if (
        !classroom.classTeacher ||
        classroom.classTeacher.toString() !==
          req.user._id.toString()
      ) {
        return res.status(403).json({
          message:
            "You are not allowed to mark attendance for this classroom.",
        });
      }
    }

    // ------------------------------------------
    // TEACHER CAN ONLY MARK TODAY
    // ------------------------------------------

    if (req.user.role === "teacher") {
      const selectedDate =
        new Date(date);

      if (
        Number.isNaN(
          selectedDate.getTime()
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid attendance date.",
        });
      }

      const today = new Date();

      const selectedDay =
        new Date(
          Date.UTC(
            selectedDate.getUTCFullYear(),
            selectedDate.getUTCMonth(),
            selectedDate.getUTCDate()
          )
        );

      const todayDay =
        new Date(
          Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate()
          )
        );

      if (
        selectedDay.getTime() !==
        todayDay.getTime()
      ) {
        return res.status(400).json({
          message:
            "Teachers can only mark attendance for today.",
        });
      }
    }

    // ------------------------------------------
    // NORMALIZE DATE
    // ------------------------------------------

    const attendanceDate =
      new Date(date);

    if (
      Number.isNaN(
        attendanceDate.getTime()
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid attendance date.",
      });
    }

    attendanceDate.setUTCHours(
      0,
      0,
      0,
      0
    );

    // ------------------------------------------
    // CHECK EXISTING ATTENDANCE
    // ------------------------------------------

    if (req.user.role === "teacher") {
      const existingRecords =
        await Attendance.find({
          classroom: classroomId,
          date: attendanceDate,
        });

      if (existingRecords.length > 0) {
        return res.status(400).json({
          message:
            "Attendance for today has already been submitted. Teachers cannot edit submitted attendance.",
        });
      }
    }

    // ------------------------------------------
    // VALID STATUSES
    // ------------------------------------------

    const validStatuses = [
      "Present",
      "Absent",
      "Duty Leave",
    ];

    for (const item of attendanceRecords) {
      if (
        !item.studentId ||
        !validStatuses.includes(
          item.status
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid student or attendance status.",
        });
      }
    }

    // ------------------------------------------
    // VERIFY STUDENTS BELONG TO CLASSROOM
    // ------------------------------------------

    const studentIds =
      attendanceRecords.map(
        (item) => item.studentId
      );

    const students =
      await User.find({
        _id: {
          $in: studentIds,
        },
        role: "student",
        classroom: classroomId,
      }).select("_id");

    const validStudentIds =
      new Set(
        students.map((student) =>
          student._id.toString()
        )
      );

    for (const item of attendanceRecords) {
      if (
        !validStudentIds.has(
          item.studentId.toString()
        )
      ) {
        return res.status(403).json({
          message:
            "One or more students do not belong to this classroom.",
        });
      }
    }

    // ------------------------------------------
    // CREATE ATTENDANCE RECORDS
    // ------------------------------------------

    const operations =
      attendanceRecords.map(
        (item) => ({
          insertOne: {
            document: {
              student:
                item.studentId,
              classroom:
                classroomId,
              date: attendanceDate,
              status:
                item.status,
              recordedBy:
                req.user._id,
            },
          },
        })
      );

    await Attendance.bulkWrite(
      operations
    );

    return res.status(201).json({
      message:
        "Attendance submitted successfully.",
    });
  } catch (error) {
    console.error(
      "RECORD ATTENDANCE ERROR:",
      error
    );

    // Duplicate record protection
    if (error.code === 11000) {
      return res.status(400).json({
        message:
          "Attendance for one or more students has already been submitted.",
      });
    }

    return res.status(500).json({
      message:
        "Failed to record attendance.",
    });
  }
};

// ==========================================
// GET ATTENDANCE
// ==========================================
exports.getAttendance = async (
  req,
  res
) => {
  try {
    const {
      classroomId,
      studentId,
      startDate,
      endDate,
    } = req.query;

    const query = {};

    // ------------------------------------------
    // STUDENT
    // ------------------------------------------

    if (req.user.role === "student") {
      query.student = req.user._id;
    }

    // ------------------------------------------
    // TEACHER
    // ------------------------------------------

    else if (
      req.user.role === "teacher"
    ) {
      if (!classroomId) {
        return res.status(400).json({
          message:
            "Classroom ID is required.",
        });
      }

      const classroom =
        await Classroom.findOne({
          _id: classroomId,
          classTeacher:
            req.user._id,
        });

      if (!classroom) {
        return res.status(403).json({
          message:
            "You are not allowed to view attendance for this classroom.",
        });
      }

      query.classroom =
        classroom._id;

      if (studentId) {
        query.student = studentId;
      }
    }

    // ------------------------------------------
    // ADMIN
    // ------------------------------------------

    else if (
      req.user.role === "admin"
    ) {
      if (studentId) {
        query.student = studentId;
      }

      if (classroomId) {
        query.classroom =
          classroomId;
      }
    }

    // ------------------------------------------
    // DATE FILTER
    // ------------------------------------------

    if (
      startDate &&
      endDate
    ) {
      const start =
        new Date(startDate);

      const end =
        new Date(endDate);

      if (
        Number.isNaN(
          start.getTime()
        ) ||
        Number.isNaN(
          end.getTime()
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid date range.",
        });
      }

      start.setUTCHours(
        0,
        0,
        0,
        0
      );

      end.setUTCHours(
        23,
        59,
        59,
        999
      );

      query.date = {
        $gte: start,
        $lte: end,
      };
    }

    // ------------------------------------------
    // GET RECORDS
    // ------------------------------------------

    const records =
      await Attendance.find(
        query
      )
        .populate(
          "student",
          "name rollNumber email phone"
        )
        .populate(
          "classroom",
          "name section"
        )
        .populate(
          "recordedBy",
          "name email role"
        )
        .sort({
          date: -1,
        });

    return res.status(200).json(
      records
    );
  } catch (error) {
    console.error(
      "GET ATTENDANCE ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to get attendance.",
    });
  }
};

// ==========================================
// ADMIN CORRECT ATTENDANCE
// ==========================================
exports.correctAttendance = async (
  req,
  res
) => {
  try {
    const {
      classroomId,
      date,
      attendanceRecords,
    } = req.body;

    // ------------------------------------------
    // BASIC VALIDATION
    // ------------------------------------------

    if (
      !classroomId ||
      !date ||
      !Array.isArray(
        attendanceRecords
      ) ||
      attendanceRecords.length === 0
    ) {
      return res.status(400).json({
        message:
          "Classroom, date and attendance records are required.",
      });
    }

    // ------------------------------------------
    // VERIFY CLASSROOM
    // ------------------------------------------

    const classroom =
      await Classroom.findById(
        classroomId
      );

    if (!classroom) {
      return res.status(404).json({
        message:
          "Classroom not found.",
      });
    }

    // ------------------------------------------
    // NORMALIZE DATE
    // ------------------------------------------

    const attendanceDate =
      new Date(date);

    if (
      Number.isNaN(
        attendanceDate.getTime()
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid attendance date.",
      });
    }

    attendanceDate.setUTCHours(
      0,
      0,
      0,
      0
    );

    // ------------------------------------------
    // VALID STATUSES
    // ------------------------------------------

    const validStatuses = [
      "Present",
      "Absent",
      "Duty Leave",
    ];

    for (const item of attendanceRecords) {
      if (
        !item.studentId ||
        !validStatuses.includes(
          item.status
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid student or attendance status.",
        });
      }
    }

    // ------------------------------------------
    // VERIFY STUDENTS
    // ------------------------------------------

    const studentIds =
      attendanceRecords.map(
        (item) => item.studentId
      );

    const students =
      await User.find({
        _id: {
          $in: studentIds,
        },
        role: "student",
        classroom: classroomId,
      }).select("_id");

    const validStudentIds =
      new Set(
        students.map((student) =>
          student._id.toString()
        )
      );

    for (const item of attendanceRecords) {
      if (
        !validStudentIds.has(
          item.studentId.toString()
        )
      ) {
        return res.status(403).json({
          message:
            "One or more students do not belong to this classroom.",
        });
      }
    }

    // ------------------------------------------
    // UPDATE / CREATE CORRECTED RECORDS
    // ------------------------------------------

    const operations =
      attendanceRecords.map(
        (item) => ({
          updateOne: {
            filter: {
              student:
                item.studentId,

              classroom:
                classroomId,

              date:
                attendanceDate,
            },

            update: {
              $set: {
                status:
                  item.status,

                recordedBy:
                  req.user._id,
              },
            },

            upsert: true,
          },
        })
      );

    await Attendance.bulkWrite(
      operations
    );

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------

    return res.status(200).json({
      message:
        "Attendance corrected successfully.",
    });
  } catch (error) {
    console.error(
      "CORRECT ATTENDANCE ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to correct attendance.",
    });
  }
};