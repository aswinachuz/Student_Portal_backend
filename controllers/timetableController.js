const Timetable = require("../models/Timetable");
const User = require("../models/User");
const Classroom = require("../models/Classroom");
const TeachingAssignment = require("../models/TeachingAssignment");
const { getTeacherClassroomIds } = require("../services/teacherService");

const PERIOD_TIMES = {
  "1st": { startTime: "09:15", endTime: "10:15" },
  "2nd": { startTime: "10:15", endTime: "11:15" },
  "3rd": { startTime: "11:15", endTime: "12:15" },
  "4th": { startTime: "13:00", endTime: "14:00" },
  "5th": { startTime: "14:00", endTime: "15:00" },
  "6th": { startTime: "15:00", endTime: "16:00" },
};

// ------------------------------------
// GET TIMETABLE
// ------------------------------------
exports.getTimetable = async (req, res) => {
  try {
    let query = {};

    // --------------------------------
    // TEACHER
    // --------------------------------
    if (req.user.role === "teacher") {
      const classroomIds = await getTeacherClassroomIds(req.user._id);

      if (classroomIds.length === 0) {
        return res.status(200).json({
          message: "No classroom assigned",
          count: 0,
          data: [],
        });
      }

      query.classroom = { $in: classroomIds };
    }

    // --------------------------------
    // STUDENT
    // --------------------------------
    if (req.user.role === "student") {
      if (!req.user.classroom) {
        return res.status(400).json({
          message: "No classroom assigned to this student",
        });
      }

      query.classroom = req.user.classroom;
    }

    const timetable = await Timetable.find(query)
      .populate("classroom", "name section")
      .populate("subject", "name code")
      .populate("teacher", "name email")
      .sort({
        day: 1,
        period: 1,
        startTime: 1,
      });

    res.status(200).json({
      message: "Timetable fetched successfully",
      count: timetable.length,
      data: timetable,
    });
  } catch (error) {
    console.error("GET TIMETABLE ERROR:", error);

    res.status(500).json({
      message: "Failed to fetch timetable",
    });
  }
};

// ------------------------------------
// ADD TIMETABLE
// ONLY CLASS TEACHER
// ------------------------------------
exports.addTimetable = async (req, res) => {
  try {
    const {
      subject,
      teacher,
      day,
      period,
      startTime,
      endTime,
    } = req.body;

    const assignedPeriod =
      period ||
      (startTime
        ? startTime.startsWith("09")
          ? "1st"
          : startTime.startsWith("10")
          ? "2nd"
          : startTime.startsWith("11")
          ? "3rd"
          : startTime.startsWith("12") || startTime.startsWith("13")
          ? "4th"
          : startTime.startsWith("14")
          ? "5th"
          : "6th"
        : null);

    if (!subject || !teacher || !day || !assignedPeriod) {
      return res.status(400).json({
        message: "Subject, teacher, day, and period are required",
      });
    }

    const defaultTimes = PERIOD_TIMES[assignedPeriod] || {
      startTime: "09:15",
      endTime: "10:15",
    };
    const finalStartTime = startTime || defaultTimes.startTime;
    const finalEndTime = endTime || defaultTimes.endTime;

    // Find classroom where logged-in teacher is Class Teacher
    const classroom = await Classroom.findOne({
      classTeacher: req.user._id,
    });

    if (!classroom) {
      return res.status(403).json({
        message: "Only the Class Teacher can add timetable",
      });
    }

    // Make sure selected teacher is actually assigned
    // to this classroom + subject
    const teachingAssignment = await TeachingAssignment.findOne({
      classroom: classroom._id,
      subject,
      teacher,
    });

    if (!teachingAssignment) {
      return res.status(400).json({
        message:
          "This teacher is not assigned to this subject in this classroom",
      });
    }

    // Check if slot already exists for this classroom on this day and period
    const existingSlot = await Timetable.findOne({
      classroom: classroom._id,
      day,
      period: assignedPeriod,
    });

    if (existingSlot) {
      return res.status(400).json({
        message: `A subject is already scheduled for ${assignedPeriod} Period on ${day}. Please edit or delete the existing slot.`,
      });
    }

    const timetable = await Timetable.create({
      classroom: classroom._id,
      subject,
      teacher,
      day,
      period: assignedPeriod,
      startTime: finalStartTime,
      endTime: finalEndTime,
    });

    const populatedTimetable = await Timetable.findById(
      timetable._id
    )
      .populate("classroom", "name section")
      .populate("subject", "name code")
      .populate("teacher", "name email");

    res.status(201).json({
      message: "Timetable added successfully",
      data: populatedTimetable,
    });
  } catch (error) {
    console.error("ADD TIMETABLE ERROR:", error);

    res.status(400).json({
      message: error.message,
    });
  }
};

// ------------------------------------
// UPDATE TIMETABLE
// ONLY CLASS TEACHER
// ------------------------------------
exports.updateTimetable = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      subject,
      teacher,
      day,
      period,
      startTime,
      endTime,
    } = req.body;

    // Find classroom where logged-in teacher
    // is the Class Teacher
    const classroom = await Classroom.findOne({
      classTeacher: req.user._id,
    });

    if (!classroom) {
      return res.status(403).json({
        message: "Only the Class Teacher can update timetable",
      });
    }

    const timetable = await Timetable.findOne({
      _id: id,
      classroom: classroom._id,
    });

    if (!timetable) {
      return res.status(404).json({
        message: "Timetable entry not found",
      });
    }

    if (subject !== undefined) {
      timetable.subject = subject;
    }

    if (teacher !== undefined) {
      timetable.teacher = teacher;
    }

    if (day !== undefined) {
      timetable.day = day;
    }

    if (period !== undefined) {
      timetable.period = period;
      if (PERIOD_TIMES[period]) {
        timetable.startTime = PERIOD_TIMES[period].startTime;
        timetable.endTime = PERIOD_TIMES[period].endTime;
      }
    }

    if (startTime !== undefined && !period) {
      timetable.startTime = startTime;
    }

    if (endTime !== undefined && !period) {
      timetable.endTime = endTime;
    }

    // Check if updated slot conflicts with another slot
    const conflictSlot = await Timetable.findOne({
      _id: { $ne: timetable._id },
      classroom: classroom._id,
      day: timetable.day,
      period: timetable.period,
    });

    if (conflictSlot) {
      return res.status(400).json({
        message: `A subject is already scheduled for ${timetable.period} Period on ${timetable.day}.`,
      });
    }

    // Verify teacher + subject assignment
    const teachingAssignment = await TeachingAssignment.findOne({
      classroom: classroom._id,
      subject: timetable.subject,
      teacher: timetable.teacher,
    });

    if (!teachingAssignment) {
      return res.status(400).json({
        message:
          "This teacher is not assigned to this subject in this classroom",
      });
    }

    await timetable.save();

    const updatedTimetable = await Timetable.findById(
      timetable._id
    )
      .populate("classroom", "name section")
      .populate("subject", "name code")
      .populate("teacher", "name email");

    res.status(200).json({
      message: "Timetable updated successfully",
      data: updatedTimetable,
    });
  } catch (error) {
    console.error("UPDATE TIMETABLE ERROR:", error);

    res.status(400).json({
      message: error.message,
    });
  }
};

// ------------------------------------
// DELETE TIMETABLE
// ONLY CLASS TEACHER
// ------------------------------------
exports.deleteTimetable = async (req, res) => {
  try {
    const { id } = req.params;

    // Find classroom where logged-in teacher
    // is the Class Teacher
    const classroom = await Classroom.findOne({
      classTeacher: req.user._id,
    });

    if (!classroom) {
      return res.status(403).json({
        message: "Only the Class Teacher can delete timetable",
      });
    }

    const timetable = await Timetable.findOne({
      _id: id,
      classroom: classroom._id,
    });

    if (!timetable) {
      return res.status(404).json({
        message: "Timetable entry not found",
      });
    }

    await timetable.deleteOne();

    res.status(200).json({
      message: "Timetable deleted successfully",
    });
  } catch (error) {
    console.error("DELETE TIMETABLE ERROR:", error);

    res.status(500).json({
      message: "Failed to delete timetable",
    });
  }
};