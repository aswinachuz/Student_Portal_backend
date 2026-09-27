const User = require("../models/User");
const Classroom = require("../models/Classroom");
const TeachingAssignment = require("../models/TeachingAssignment");
const fs = require("fs");
const path = require("path");

const { getTeacherClassroomIds } = require("../services/teacherService");
// ======================================================
// GET STUDENTS
// ======================================================
// Class Teacher:
//   Can see students of their own classroom.
//
// Subject Teacher:
//   Can see students from classrooms where
//   they have a teaching assignment.
// ======================================================

const getStudents = async (req, res) => {
  try {
    const teacherId = req.user._id;

    const classroomIds = await getTeacherClassroomIds(teacherId);

    // ------------------------------------------
    // No classrooms found
    // ------------------------------------------

    if (classroomIds.length === 0) {
      return res.status(200).json({
        data: [],
      });
    }

    // ------------------------------------------
    // Get students
    // ------------------------------------------

    const students = await User.find({
      role: "student",
      classroom: {
        $in: classroomIds,
      },
    })
      .select(
        "name email rollNumber phone gender dateOfBirth address avatar classroom"
      )
      .populate(
        "classroom",
        "name section"
      )
      .sort({
        name: 1,
      });

    // ------------------------------------------
    // Response
    // ------------------------------------------

    res.status(200).json({
      data: students,
    });

  } catch (error) {
    console.error(
      "GET STUDENTS ERROR:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};


// ======================================================
// GENERATE NEXT STUDENT ID
// ======================================================

const generateStudentId = async () => {
  const students = await User.find({
    role: "student",
    rollNumber: {
      $regex: /^APS\d+$/,
    },
  }).select("rollNumber");

  let maxNumber = 0;

  students.forEach((student) => {
    const number = parseInt(
      student.rollNumber.replace("APS", ""),
      10
    );

    if (!isNaN(number) && number > maxNumber) {
      maxNumber = number;
    }
  });

  const nextNumber = maxNumber + 1;

  return `APS${String(nextNumber).padStart(3, "0")}`;
};


// ======================================================
// ADD STUDENT
// ======================================================

const addStudent = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      dateOfBirth,
      gender,
      address,
      classroom,
    } = req.body;
// Check teacher's classroom access
const allowedClassrooms = await getTeacherClassroomIds(
  req.user._id
);

if (!classroom) {
  return res.status(400).json({
    message: "Classroom is required",
  });
}

const hasAccess = allowedClassrooms.some(
  (id) => id.toString() === classroom.toString()
);

if (!hasAccess) {
  return res.status(403).json({
    message: "You are not allowed to add a student to this classroom",
  });
}
    // ------------------------------------------
    // Required fields
    // ------------------------------------------

    if (!name || !email) {
      return res.status(400).json({
        message:
          "Name and email are required",
      });
    }

    // ------------------------------------------
    // Check email
    // ------------------------------------------

    const existingStudent =
      await User.findOne({
        email: email.toLowerCase(),
      });

    if (existingStudent) {
      return res.status(400).json({
        message:
          "A user with this email already exists",
      });
    }

    // ------------------------------------------
    // Generate student ID
    // ------------------------------------------

    const rollNumber =
      await generateStudentId();

    // ------------------------------------------
    // Create student
    // ------------------------------------------

    const student =
      new User({
        name,
        email: email.toLowerCase(),
        password:
          password || "123456",
        role: "student",
        rollNumber,
        phone,
        dateOfBirth,
        gender,
        address,
        classroom:
          classroom || undefined,
        avatar: req.file
          ? `/uploads/${req.file.filename}`
          : undefined,
      });

    await student.save();

    // ------------------------------------------
    // Response
    // ------------------------------------------

    const createdStudent =
      await User.findById(student._id)
        .select(
          "name email rollNumber phone gender dateOfBirth address avatar classroom"
        )
        .populate(
          "classroom",
          "name section"
        );

    res.status(201).json({
      message:
        "Student added successfully",
      data: createdStudent,
    });

  } catch (error) {
    console.error(
      "ADD STUDENT ERROR:",
      error
    );

    // Delete uploaded photo if
    // database save failed
    if (req.file) {
      const filePath = path.join(
        __dirname,
        "..",
        "uploads",
        req.file.filename
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(500).json({
      message: error.message,
    });
  }
};


// ======================================================
// UPDATE STUDENT
// ======================================================

const updateStudent = async (
  req,
  res
) => {
  try {
    const student =
      await User.findOne({
        _id: req.params.id,
        role: "student",
      });

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }
    // Check teacher's classroom access
const allowedClassrooms = await getTeacherClassroomIds(
  req.user._id
);

const studentHasAccess = allowedClassrooms.some(
  (id) =>
    student.classroom &&
    id.toString() === student.classroom.toString()
);

if (!studentHasAccess) {
  return res.status(403).json({
    message: "You are not allowed to update this student",
  });
}
    // ------------------------------------------
    // Update basic information
    // ------------------------------------------

    if (req.body.name !== undefined) {
      student.name =
        req.body.name;
    }

    if (req.body.email !== undefined) {
      student.email =
        req.body.email.toLowerCase();
    }

    if (req.body.phone !== undefined) {
      student.phone =
        req.body.phone;
    }

    if (
      req.body.dateOfBirth !==
      undefined
    ) {
      student.dateOfBirth =
        req.body.dateOfBirth;
    }

    if (req.body.gender !== undefined) {
      student.gender =
        req.body.gender;
    }

    if (req.body.address !== undefined) {
      student.address =
        req.body.address;
    }

    if (req.body.classroom !== undefined) {
  const newClassroom = req.body.classroom;

  const newClassroomAllowed = allowedClassrooms.some(
    (id) =>
      newClassroom &&
      id.toString() === newClassroom.toString()
  );

  if (!newClassroomAllowed) {
    return res.status(403).json({
      message:
        "You are not allowed to move the student to this classroom",
    });
  }

  student.classroom = newClassroom;
}
    // ------------------------------------------
    // Update password
    // ------------------------------------------

    if (
      req.body.password &&
      req.body.password.trim() !== ""
    ) {
      student.password =
        req.body.password;
    }

    // ------------------------------------------
    // Update photo
    // ------------------------------------------

    if (req.file) {

      // Delete old photo
      if (student.avatar) {

        const oldFileName =
          path.basename(
            student.avatar
          );

        const oldFilePath =
          path.join(
            __dirname,
            "..",
            "uploads",
            oldFileName
          );

        if (
          fs.existsSync(oldFilePath)
        ) {
          fs.unlinkSync(
            oldFilePath
          );
        }
      }

      student.avatar =
        `/uploads/${req.file.filename}`;
    }

    await student.save();

    // ------------------------------------------
    // Response
    // ------------------------------------------

    const updatedStudent =
      await User.findById(
        student._id
      )
        .select(
          "name email rollNumber phone gender dateOfBirth address avatar classroom"
        )
        .populate(
          "classroom",
          "name section"
        );

    res.status(200).json({
      message:
        "Student updated successfully",
      data: updatedStudent,
    });

  } catch (error) {
    console.error(
      "UPDATE STUDENT ERROR:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};


// ======================================================
// DELETE STUDENT
// ======================================================

const deleteStudent = async (
  req,
  res
) => {
  try {
    const student =
      await User.findOne({
        _id: req.params.id,
        role: "student",
      });

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }
    // Check teacher's classroom access
const allowedClassrooms = await getTeacherClassroomIds(
  req.user._id
);

const studentHasAccess = allowedClassrooms.some(
  (id) =>
    student.classroom &&
    id.toString() === student.classroom.toString()
);

if (!studentHasAccess) {
  return res.status(403).json({
    message: "You are not allowed to delete this student",
  });
}
    // ------------------------------------------
    // Delete profile photo
    // ------------------------------------------

    if (student.avatar) {

      const fileName =
        path.basename(
          student.avatar
        );

      const filePath =
        path.join(
          __dirname,
          "..",
          "uploads",
          fileName
        );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // ------------------------------------------
    // Delete student
    // ------------------------------------------

    await User.findByIdAndDelete(
      student._id
    );

    res.status(200).json({
      message:
        "Student deleted successfully",
    });

  } catch (error) {
    console.error(
      "DELETE STUDENT ERROR:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  getStudents,
  addStudent,
  updateStudent,
  deleteStudent,
};