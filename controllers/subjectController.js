const Subject = require("../models/Subject");
const Classroom = require("../models/Classroom");
const User = require("../models/User");

// GET ALL SUBJECTS
exports.getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find()
      .populate("classroom", "name section")
      .populate("teacher", "name email")
      .sort({ name: 1 });

    res.status(200).json({
      message: "Subjects fetched successfully",
      count: subjects.length,
      data: subjects,
    });
  } catch (error) {
    console.error("GET SUBJECTS ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// ADD SUBJECT
exports.addSubject = async (req, res) => {
  try {
    const {
      name,
      code,
      classroom,
      teacher,
    } = req.body;

    if (!name || !code || !classroom) {
      return res.status(400).json({
        message: "Subject name, code and classroom are required",
      });
    }

    const classroomExists = await Classroom.findById(classroom);

    if (!classroomExists) {
      return res.status(404).json({
        message: "Classroom not found",
      });
    }

    const existingSubject = await Subject.findOne({
      code,
    });

    if (existingSubject) {
      return res.status(400).json({
        message: "A subject with this code already exists",
      });
    }

    if (teacher) {
      const teacherExists = await User.findOne({
        _id: teacher,
        role: "teacher",
      });

      if (!teacherExists) {
        return res.status(404).json({
          message: "Teacher not found",
        });
      }
    }

    const subject = await Subject.create({
      name,
      code,
      classroom,
      teacher: teacher || null,
    });

    const subjectResponse = await Subject.findById(subject._id)
      .populate("classroom", "name section")
      .populate("teacher", "name email");

    res.status(201).json({
      message: "Subject added successfully",
      data: subjectResponse,
    });
  } catch (error) {
    console.error("ADD SUBJECT ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// UPDATE SUBJECT
exports.updateSubject = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await Subject.findById(id);

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found",
      });
    }

    const {
      name,
      code,
      classroom,
      teacher,
    } = req.body;

    if (code && code !== subject.code) {
      const existingSubject = await Subject.findOne({
        code,
        _id: { $ne: id },
      });

      if (existingSubject) {
        return res.status(400).json({
          message: "A subject with this code already exists",
        });
      }

      subject.code = code;
    }

    if (classroom) {
      const classroomExists =
        await Classroom.findById(classroom);

      if (!classroomExists) {
        return res.status(404).json({
          message: "Classroom not found",
        });
      }

      subject.classroom = classroom;
    }

    if (teacher) {
      const teacherExists = await User.findOne({
        _id: teacher,
        role: "teacher",
      });

      if (!teacherExists) {
        return res.status(404).json({
          message: "Teacher not found",
        });
      }

      subject.teacher = teacher;
    }

    if (teacher === "") {
      subject.teacher = null;
    }

    if (name) {
      subject.name = name;
    }

    await subject.save();

    const updatedSubject = await Subject.findById(
      subject._id
    )
      .populate("classroom", "name section")
      .populate("teacher", "name email");

    res.status(200).json({
      message: "Subject updated successfully",
      data: updatedSubject,
    });
  } catch (error) {
    console.error("UPDATE SUBJECT ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// DELETE SUBJECT
exports.deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await Subject.findById(id);

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found",
      });
    }

    await Subject.findByIdAndDelete(id);

    res.status(200).json({
      message: "Subject deleted successfully",
    });
  } catch (error) {
    console.error("DELETE SUBJECT ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};