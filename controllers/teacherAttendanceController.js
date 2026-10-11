const TeacherAttendance = require("../models/TeacherAttendance");
const User = require("../models/User");

// ==========================================
// GET TEACHER ATTENDANCE
// ==========================================
exports.getTeacherAttendance = async (req, res) => {
  try {
    const { teacherId, date, startDate, endDate, month } = req.query;
    const query = {};

    // If teacher, only allow viewing their own attendance
    if (req.user.role === "teacher") {
      query.teacher = req.user._id;
    } else if (req.user.role === "admin" && teacherId) {
      query.teacher = teacherId;
    }

    // Single Date filter
    if (date) {
      const targetDate = new Date(date);
      if (!Number.isNaN(targetDate.getTime())) {
        targetDate.setUTCHours(0, 0, 0, 0);
        query.date = targetDate;
      }
    }
    // Date Range filter
    else if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(23, 59, 59, 999);
        query.date = { $gte: start, $lte: end };
      }
    }
    // Month filter (YYYY-MM)
    else if (month) {
      const [yearNum, monthNum] = month.split("-").map(Number);
      if (yearNum && monthNum) {
        const start = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));
        query.date = { $gte: start, $lte: end };
      }
    }

    const records = await TeacherAttendance.find(query)
      .populate("teacher", "name email phone gender classroom")
      .populate("recordedBy", "name email")
      .sort({ date: -1, "teacher.name": 1 });

    return res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error("GET TEACHER ATTENDANCE ERROR:", error);
    return res.status(500).json({
      message: "Failed to retrieve teacher attendance.",
      error: error.message,
    });
  }
};

// ==========================================
// RECORD / EDIT BATCH TEACHER ATTENDANCE (ADMIN)
// ==========================================
exports.recordBatchTeacherAttendance = async (req, res) => {
  try {
    const { date, attendanceRecords } = req.body;

    if (!date || !Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      return res.status(400).json({
        message: "Date and attendance records array are required.",
      });
    }

    const attendanceDate = new Date(date);
    if (Number.isNaN(attendanceDate.getTime())) {
      return res.status(400).json({
        message: "Invalid attendance date.",
      });
    }

    attendanceDate.setUTCHours(0, 0, 0, 0);

    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);

    if (attendanceDate > today) {
      return res.status(400).json({
        message: "Cannot mark teacher attendance for future dates.",
      });
    }

    const validStatuses = ["Present", "Absent", "Half Day", "On Leave"];

    for (const item of attendanceRecords) {
      if (!item.teacherId || !validStatuses.includes(item.status)) {
        return res.status(400).json({
          message: "Each record must have a valid teacherId and status (Present, Absent, Half Day, On Leave).",
        });
      }
    }

    // Verify all IDs belong to teachers
    const teacherIds = attendanceRecords.map((item) => item.teacherId);
    const existingTeachers = await User.find({
      _id: { $in: teacherIds },
      role: "teacher",
    }).select("_id");

    const validTeacherIdSet = new Set(existingTeachers.map((t) => t._id.toString()));

    for (const item of attendanceRecords) {
      if (!validTeacherIdSet.has(item.teacherId.toString())) {
        return res.status(400).json({
          message: `User ${item.teacherId} is not a valid teacher.`,
        });
      }
    }

    const operations = attendanceRecords.map((item) => ({
      updateOne: {
        filter: {
          teacher: item.teacherId,
          date: attendanceDate,
        },
        update: {
          $set: {
            status: item.status,
            remarks: item.remarks || "",
            recordedBy: req.user._id,
          },
        },
        upsert: true,
      },
    }));

    await TeacherAttendance.bulkWrite(operations);

    return res.status(200).json({
      success: true,
      message: `Teacher attendance saved successfully for ${attendanceRecords.length} faculty member(s).`,
    });
  } catch (error) {
    console.error("RECORD TEACHER ATTENDANCE ERROR:", error);
    return res.status(500).json({
      message: "Failed to record teacher attendance.",
      error: error.message,
    });
  }
};

// ==========================================
// GET TEACHER ATTENDANCE STATS
// ==========================================
exports.getTeacherAttendanceStats = async (req, res) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const totalTeachers = await User.countDocuments({ role: "teacher" });

    // Today's stats
    const todayRecords = await TeacherAttendance.find({ date: today });
    const todayStats = {
      totalTeachers,
      marked: todayRecords.length,
      present: todayRecords.filter((r) => r.status === "Present").length,
      absent: todayRecords.filter((r) => r.status === "Absent").length,
      halfDay: todayRecords.filter((r) => r.status === "Half Day").length,
      onLeave: todayRecords.filter((r) => r.status === "On Leave").length,
    };

    // If teacher requesting their own stats for current month
    let myMonthlyStats = null;
    if (req.user.role === "teacher") {
      const year = today.getUTCFullYear();
      const month = today.getUTCMonth();
      const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

      const myRecords = await TeacherAttendance.find({
        teacher: req.user._id,
        date: { $gte: startOfMonth, $lte: endOfMonth },
      });

      const totalMarked = myRecords.length;
      const presentDays = myRecords.filter((r) => r.status === "Present").length;
      const halfDays = myRecords.filter((r) => r.status === "Half Day").length;
      const leaveDays = myRecords.filter((r) => r.status === "On Leave").length;
      const absentDays = myRecords.filter((r) => r.status === "Absent").length;

      const effectiveAttendance = presentDays + halfDays * 0.5;
      const percentage = totalMarked > 0 ? ((effectiveAttendance / totalMarked) * 100).toFixed(1) : "100.0";

      // Today's status for this teacher
      const myTodayRecord = todayRecords.find(
        (r) => r.teacher.toString() === req.user._id.toString()
      );

      myMonthlyStats = {
        totalMarked,
        presentDays,
        halfDays,
        leaveDays,
        absentDays,
        percentage,
        todayStatus: myTodayRecord ? myTodayRecord.status : "Not Marked Yet",
      };
    }

    return res.status(200).json({
      success: true,
      todayStats,
      myMonthlyStats,
    });
  } catch (error) {
    console.error("GET TEACHER ATTENDANCE STATS ERROR:", error);
    return res.status(500).json({
      message: "Failed to retrieve teacher attendance stats.",
      error: error.message,
    });
  }
};
