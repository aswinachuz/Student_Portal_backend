const User = require("../models/User");
const Classroom = require("../models/Classroom");

// ==========================================
// GET CLASSROOMS
// ADMIN → all classrooms
// TEACHER → only assigned classroom
// ==========================================
exports.getClassrooms = async (req, res) => {
  try {
    // TEACHER
    if (req.user.role === "teacher") {
      const teacher = await User.findById(req.user._id);

      if (!teacher) {
        return res.status(404).json({
          message: "Teacher not found",
        });
      }

      if (!teacher.classroom) {
        return res.status(400).json({
          message: "No classroom assigned to this teacher",
        });
      }

      const classroom = await Classroom.findById(
        teacher.classroom
      ).populate("classTeacher", "name email");

      if (!classroom) {
        return res.status(404).json({
          message: "Assigned classroom not found",
        });
      }

      return res.status(200).json({
        message: "Classroom fetched successfully",
        count: 1,
        data: [classroom],
      });
    }

    // ADMIN
    const classrooms = await Classroom.find()
      .populate("classTeacher", "name email")
      .sort({ name: 1, section: 1 });

    res.status(200).json({
      message: "Classrooms fetched successfully",
      count: classrooms.length,
      data: classrooms,
    });
  } catch (error) {
    console.error("GET CLASSROOMS ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};


// ==========================================
// ADD CLASSROOM
// ADMIN ONLY
// ==========================================
exports.addClassroom = async (req, res) => {
  try {
    const { name, section } = req.body;

    if (!name || !section) {
      return res.status(400).json({
        message: "Class name and section are required",
      });
    }

    const existingClassroom = await Classroom.findOne({
      name,
      section,
    });

    if (existingClassroom) {
      return res.status(400).json({
        message: "This class and section already exists",
      });
    }

    const classroom = await Classroom.create({
      name,
      section,
    });

    res.status(201).json({
      message: "Classroom added successfully",
      data: classroom,
    });
  } catch (error) {
    console.error("ADD CLASSROOM ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};


// ==========================================
// UPDATE CLASSROOM
// ADMIN ONLY
// ==========================================
exports.updateClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, section } = req.body;

    const classroom = await Classroom.findById(id);

    if (!classroom) {
      return res.status(404).json({
        message: "Classroom not found",
      });
    }

    if (name !== undefined) {
      classroom.name = name;
    }

    if (section !== undefined) {
      classroom.section = section;
    }

    await classroom.save();

    const updatedClassroom = await Classroom.findById(
      classroom._id
    ).populate("classTeacher", "name email");

    res.status(200).json({
      message: "Classroom updated successfully",
      data: updatedClassroom,
    });
  } catch (error) {
    console.error("UPDATE CLASSROOM ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};


// ==========================================
// ASSIGN CLASS TEACHER
// ADMIN ONLY
// ==========================================
exports.assignClassTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId } = req.body;

    // Validate teacher ID
    if (!teacherId) {
      return res.status(400).json({
        message: "Teacher ID is required",
      });
    }

    // Find classroom
    const classroom = await Classroom.findById(id);

    if (!classroom) {
      return res.status(404).json({
        message: "Classroom not found",
      });
    }

    // Find teacher
    const teacher = await User.findOne({
      _id: teacherId,
      role: "teacher",
    });

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found",
      });
    }

    // If another classroom already has this teacher,
    // remove the teacher from that classroom.
    if (
      teacher.classroom &&
      teacher.classroom.toString() !== classroom._id.toString()
    ) {
      await Classroom.updateOne(
        {
          _id: teacher.classroom,
          classTeacher: teacher._id,
        },
        {
          $set: {
            classTeacher: null,
          },
        }
      );
    }

    // If this classroom already has another teacher,
    // remove the classroom assignment from that teacher.
    if (
      classroom.classTeacher &&
      classroom.classTeacher.toString() !== teacher._id.toString()
    ) {
      await User.updateOne(
        {
          _id: classroom.classTeacher,
          role: "teacher",
        },
        {
          $set: {
            classroom: null,
          },
        }
      );
    }

    // Assign teacher to classroom
    classroom.classTeacher = teacher._id;
    await classroom.save();

    // Assign classroom to teacher
    teacher.classroom = classroom._id;
    await teacher.save();

    const updatedClassroom = await Classroom.findById(
      classroom._id
    ).populate("classTeacher", "name email");

    res.status(200).json({
      message: "Class teacher assigned successfully",
      data: updatedClassroom,
    });
  } catch (error) {
    console.error(
      "ASSIGN CLASS TEACHER ERROR:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};


// ==========================================
// DELETE CLASSROOM
// ADMIN ONLY
// ==========================================
exports.deleteClassroom = async (req, res) => {
  try {
    const { id } = req.params;

    const classroom = await Classroom.findById(id);

    if (!classroom) {
      return res.status(404).json({
        message: "Classroom not found",
      });
    }

    // Don't delete a classroom that has a teacher
    if (classroom.classTeacher) {
      return res.status(400).json({
        message:
          "Cannot delete classroom because a class teacher is assigned",
      });
    }

    // Don't delete a classroom with enrolled students
    const enrolledStudents = await User.countDocuments({
      role: "student",
      classroom: id,
    });

    if (enrolledStudents > 0) {
      return res.status(400).json({
        message: `Cannot delete classroom because ${enrolledStudents} student(s) are currently enrolled. Please reassign students first.`,
      });
    }

    await Classroom.findByIdAndDelete(id);

    res.status(200).json({
      message: "Classroom deleted successfully",
    });
  } catch (error) {
    console.error("DELETE CLASSROOM ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};