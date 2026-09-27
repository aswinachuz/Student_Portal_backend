const User = require("../models/User");
const Classroom = require("../models/Classroom");
const Announcement = require("../models/Announcement");
const fs = require("fs");
const path = require("path");


// ==========================================
// GET ADMIN DASHBOARD STATS
// ==========================================

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      studentsCount,
      teachersCount,
      classesCount,
      announcements,
    ] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "teacher" }),
      Classroom.countDocuments(),
      Announcement.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("author", "name role"),
    ]);

    res.json({
      counts: {
        students: studentsCount,
        teachers: teachersCount,
        classes: classesCount,
      },
      recentAnnouncements: announcements,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


// ==========================================
// GET ALL TEACHERS
// ==========================================

exports.getTeachers = async (req, res) => {
  try {
    const teachers = await User.find({
      role: "teacher",
    })
      .select("-password")
      .populate("classroom", "name section")
      .populate("subjects", "name code")
      .sort({ name: 1 });

    res.status(200).json({
      message: "Teachers fetched successfully",
      count: teachers.length,
      data: teachers,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// ==========================================
// GET STUDENTS
// Optional classroom filter
// ==========================================

exports.getStudents = async (req, res) => {
  try {
    const { classroomId } = req.query;

    const query = {
      role: "student",
    };

    // Filter by classroom when provided
    if (classroomId) {
      query.classroom = classroomId;
    }

    const students = await User.find(query)
      .select("-password")
      .populate(
        "classroom",
        "name section"
      )
      .populate(
        "subjects",
        "name code"
      )
      .sort({
        rollNumber: 1,
        name: 1,
      });

    return res.status(200).json({
      message:
        "Students fetched successfully",
      count: students.length,
      data: students,
    });
  } catch (error) {
    console.error(
      "GET STUDENTS ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch students",
    });
  }
};

// ==========================================
// GENERATE TEACHER ID
// TRS001, TRS002, TRS003...
// ==========================================

const generateTeacherId = async () => {
  const lastTeacher = await User.findOne({
    role: "teacher",
    teacherId: { $exists: true, $ne: "" },
  }).sort({ teacherId: -1 });

  let nextNumber = 1;

  if (lastTeacher && lastTeacher.teacherId) {
    const number = parseInt(
      lastTeacher.teacherId.replace("TRS", ""),
      10
    );

    if (!isNaN(number)) {
      nextNumber = number + 1;
    }
  }

  return `TRS${String(nextNumber).padStart(3, "0")}`;
};


// ==========================================
// ADD TEACHER
// ==========================================

exports.addTeacher = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      classroom,
      dateOfBirth,
      gender,
      address,
    } = req.body;

    // Name and email are required
    if (!name || !email) {
      return res.status(400).json({
        message: "Name and email are required",
      });
    }

    // Check email
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({
        message: "A user with this email already exists",
      });
    }

    // Check classroom
    if (classroom) {
      const classroomExists =
        await Classroom.findById(classroom);

      if (!classroomExists) {
        return res.status(404).json({
          message: "Classroom not found",
        });
      }
    }

    // Generate teacher ID
    const teacherId = await generateTeacherId();

    // Default password
    const teacherPassword =
      password && password.trim()
        ? password
        : "123456";

    // Create teacher
    const teacher = await User.create({
      name,
      email: email.toLowerCase(),
      password: teacherPassword,
      role: "teacher",
      teacherId,
      phone: phone || "",
      dateOfBirth: dateOfBirth || null,
      gender: gender || undefined,
      address: address || "",
      classroom: classroom || null,
      avatar: req.file
        ? `/uploads/${req.file.filename}`
        : "",
    });

    // Update classroom teacher
    if (classroom) {
      await Classroom.findByIdAndUpdate(
        classroom,
        {
          classTeacher: teacher._id,
        }
      );
    }

    // Response without password
    const teacherResponse =
      await User.findById(teacher._id)
        .select("-password")
        .populate("classroom", "name section")
        .populate("subjects", "name code");

    res.status(201).json({
      message: "Teacher added successfully",
      data: teacherResponse,
    });
  } catch (error) {
    console.error("ADD TEACHER ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};


// ==========================================
// UPDATE TEACHER
// ==========================================

exports.updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await User.findOne({
      _id: id,
      role: "teacher",
    });

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found",
      });
    }

    const {
      name,
      email,
      password,
      phone,
      classroom,
      dateOfBirth,
      gender,
      address,
    } = req.body;


    // --------------------------------------
    // Email
    // --------------------------------------

    if (
      email &&
      email.toLowerCase() !== teacher.email
    ) {
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: id },
      });

      if (existingUser) {
        return res.status(400).json({
          message:
            "A user with this email already exists",
        });
      }

      teacher.email = email.toLowerCase();
    }


    // --------------------------------------
    // Basic details
    // --------------------------------------

    if (name) {
      teacher.name = name;
    }

    if (phone !== undefined) {
      teacher.phone = phone;
    }

    if (dateOfBirth !== undefined) {
      teacher.dateOfBirth = dateOfBirth || null;
    }

    if (gender !== undefined) {
      teacher.gender = gender || undefined;
    }

    if (address !== undefined) {
      teacher.address = address;
    }


    // --------------------------------------
    // Password
    // --------------------------------------

    if (password && password.trim()) {
      teacher.password = password;
    }


    // --------------------------------------
    // New profile photo
    // --------------------------------------

    if (req.file) {
      // Delete old photo
      if (teacher.avatar) {
        const oldPhotoPath = path.join(
          __dirname,
          "..",
          teacher.avatar
        );

        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }

      teacher.avatar =
        `/uploads/${req.file.filename}`;
    }


    // --------------------------------------
    // Classroom
    // --------------------------------------

    if (
      classroom !== undefined &&
      String(classroom || "") !==
        String(teacher.classroom || "")
    ) {

      // Remove from old classroom
      if (teacher.classroom) {
        await Classroom.findByIdAndUpdate(
          teacher.classroom,
          {
            $unset: {
              classTeacher: "",
            },
          }
        );
      }

      // Assign new classroom
      if (classroom) {
        const classroomExists =
          await Classroom.findById(classroom);

        if (!classroomExists) {
          return res.status(404).json({
            message: "New classroom not found",
          });
        }

        await Classroom.findByIdAndUpdate(
          classroom,
          {
            classTeacher: teacher._id,
          }
        );
      }

      teacher.classroom =
        classroom || null;
    }


    await teacher.save();


    const updatedTeacher =
      await User.findById(teacher._id)
        .select("-password")
        .populate(
          "classroom",
          "name section"
        )
        .populate(
          "subjects",
          "name code"
        );

    res.status(200).json({
      message: "Teacher updated successfully",
      data: updatedTeacher,
    });

  } catch (error) {
    console.error(
      "UPDATE TEACHER ERROR:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};


// ==========================================
// DELETE TEACHER
// ==========================================

exports.deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await User.findOne({
      _id: id,
      role: "teacher",
    });

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found",
      });
    }


    // Remove teacher from classroom
    if (teacher.classroom) {
      await Classroom.findByIdAndUpdate(
        teacher.classroom,
        {
          $unset: {
            classTeacher: "",
          },
        }
      );
    }


    // Delete profile photo
    if (teacher.avatar) {
      const photoPath = path.join(
        __dirname,
        "..",
        teacher.avatar
      );

      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }


    // Delete teacher
    await User.findByIdAndDelete(
      teacher._id
    );


    res.status(200).json({
      message: "Teacher deleted successfully",
    });

  } catch (error) {
    console.error(
      "DELETE TEACHER ERROR:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};