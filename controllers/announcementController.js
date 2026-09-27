const Announcement = require("../models/Announcement");
const Classroom = require("../models/Classroom");
const TeachingAssignment = require("../models/TeachingAssignment");

// =====================================================
// CREATE ANNOUNCEMENT
// =====================================================

const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, audience } = req.body;

    if (!title || !content || !audience) {
      return res.status(400).json({
        message: "Title, content and audience are required",
      });
    }

    // =================================================
    // ADMIN
    // =================================================

    if (req.user.role === "admin") {
      if (
        audience !== "whole_school" &&
        audience !== "all_teachers"
      ) {
        return res.status(403).json({
          message:
            "Admin can only announce to whole school or all teachers",
        });
      }

      const announcement = await Announcement.create({
        title: title.trim(),
        content: content.trim(),
        audience,
        classroom: null,
        author: req.user._id,
      });

      const populatedAnnouncement =
        await Announcement.findById(announcement._id)
          .populate("author", "name role")
          .populate("classroom", "name section");

      return res.status(201).json({
        message: "Announcement created successfully",
        data: populatedAnnouncement,
      });
    }

    // =================================================
    // TEACHER
    // =================================================

    if (req.user.role === "teacher") {
      if (audience !== "classroom") {
        return res.status(403).json({
          message:
            "Teachers can only announce to their assigned class",
        });
      }

      // -----------------------------------------------
      // CHECK CLASS TEACHER
      // -----------------------------------------------

      const classTeacherClassroom =
        await Classroom.findOne({
          classTeacher: req.user._id,
        }).select("_id name section");

      if (classTeacherClassroom) {
        const announcement =
          await Announcement.create({
            title: title.trim(),
            content: content.trim(),
            audience: "classroom",
            classroom: classTeacherClassroom._id,
            author: req.user._id,
          });

        const populatedAnnouncement =
          await Announcement.findById(announcement._id)
            .populate("author", "name role")
            .populate("classroom", "name section");

        return res.status(201).json({
          message: "Announcement created successfully",
          data: populatedAnnouncement,
        });
      }

      // -----------------------------------------------
      // CHECK SUBJECT TEACHER
      // -----------------------------------------------

      const teachingAssignment =
        await TeachingAssignment.findOne({
          teacher: req.user._id,
        }).populate("classroom", "name section");

      if (!teachingAssignment) {
        return res.status(403).json({
          message:
            "You are not assigned to any classroom",
        });
      }

      const announcement =
        await Announcement.create({
          title: title.trim(),
          content: content.trim(),
          audience: "classroom",
          classroom: teachingAssignment.classroom._id,
          author: req.user._id,
        });

      const populatedAnnouncement =
        await Announcement.findById(announcement._id)
          .populate("author", "name role")
          .populate("classroom", "name section");

      return res.status(201).json({
        message: "Announcement created successfully",
        data: populatedAnnouncement,
      });
    }

    // =================================================
    // STUDENT
    // =================================================

    return res.status(403).json({
      message: "Students cannot create announcements",
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// GET ANNOUNCEMENTS
// =====================================================

const getAnnouncements = async (req, res, next) => {
  try {
    let announcements = [];

    // =================================================
    // ADMIN
    // =================================================

    if (req.user.role === "admin") {
      announcements = await Announcement.find()
        .populate("author", "name role")
        .populate("classroom", "name section")
        .sort({ createdAt: -1 });

      return res.json({
        data: announcements,
      });
    }

    // =================================================
    // TEACHER
    // =================================================

    if (req.user.role === "teacher") {
      const classTeacherClassrooms =
        await Classroom.find({
          classTeacher: req.user._id,
        }).select("_id");

      const teachingAssignments =
        await TeachingAssignment.find({
          teacher: req.user._id,
        }).select("classroom");

      const classroomIds = [
        ...classTeacherClassrooms.map(
          (item) => item._id.toString()
        ),

        ...teachingAssignments.map(
          (item) => item.classroom.toString()
        ),
      ];

      const uniqueClassroomIds = [
        ...new Set(classroomIds),
      ];

      announcements = await Announcement.find({
        $or: [
          {
            audience: "whole_school",
          },
          {
            audience: "all_teachers",
          },
          {
            audience: "classroom",
            classroom: {
              $in: uniqueClassroomIds,
            },
          },
        ],
      })
        .populate("author", "name role")
        .populate("classroom", "name section")
        .sort({ createdAt: -1 });

      return res.json({
        data: announcements,
      });
    }

    // =================================================
    // STUDENT
    // =================================================

    if (req.user.role === "student") {
      if (!req.user.classroom) {
        return res.json({
          data: [],
        });
      }

      // Only show announcements from the
      // last 3 days to students.
      const threeDaysAgo = new Date();

      threeDaysAgo.setDate(
        threeDaysAgo.getDate() - 3
      );

      announcements = await Announcement.find({
        createdAt: {
          $gte: threeDaysAgo,
        },

        $or: [
          {
            audience: "whole_school",
          },
          {
            audience: "classroom",
            classroom: req.user.classroom,
          },
        ],
      })
        .populate("author", "name role")
        .populate("classroom", "name section")
        .sort({ createdAt: -1 });

      return res.json({
        data: announcements,
      });
    }

    // =================================================
    // INVALID ROLE
    // =================================================

    return res.status(403).json({
      message: "Access denied",
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// DELETE ANNOUNCEMENT
// =====================================================

const deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement =
      await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        message: "Announcement not found",
      });
    }

    // =================================================
    // ADMIN
    // =================================================

    if (req.user.role === "admin") {
      await announcement.deleteOne();

      return res.json({
        message: "Announcement deleted successfully",
      });
    }

    // =================================================
    // TEACHER
    // =================================================

    if (req.user.role === "teacher") {
      // Teacher can ONLY delete their own announcement.
      //
      // This also means a teacher CANNOT delete
      // an announcement created by Admin.

      if (
        announcement.author.toString() !==
        req.user._id.toString()
      ) {
        return res.status(403).json({
          message:
            "You can only delete your own announcements",
        });
      }

      // Check Class Teacher permission
      const isClassTeacher =
        await Classroom.findOne({
          _id: announcement.classroom,
          classTeacher: req.user._id,
        });

      // Check Subject Teacher permission
      const isSubjectTeacher =
        await TeachingAssignment.findOne({
          teacher: req.user._id,
          classroom: announcement.classroom,
        });

      if (!isClassTeacher && !isSubjectTeacher) {
        return res.status(403).json({
          message:
            "You are not assigned to this classroom",
        });
      }

      await announcement.deleteOne();

      return res.json({
        message: "Announcement deleted successfully",
      });
    }

    // =================================================
    // STUDENT
    // =================================================

    return res.status(403).json({
      message:
        "You are not allowed to delete announcements",
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  createAnnouncement,
  getAnnouncements,
  deleteAnnouncement,
};