const User = require("../models/User");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");


// ==========================================
// GENERATE TOKEN
// ==========================================

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "7d",
    }
  );
};


// ==========================================
// REGISTER
// ==========================================

exports.register = async (req, res) => {
  const {
    name,
    email,
    password,
    rollNumber,
    classroom,
  } = req.body;

  try {
    const userExists = await User.findOne({
      email,
    });

    if (userExists) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role:"student",
      rollNumber,
      classroom,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


// ==========================================
// LOGIN
// ==========================================

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({
      email,
    }).populate("classroom");

    if (
      user &&
      (await user.matchPassword(password))
    ) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        classroom: user.classroom,
        avatar: user.avatar || "",
        rollNumber: user.rollNumber || "",
        teacherId: user.teacherId || "",
        phone: user.phone || "",
        dateOfBirth: user.dateOfBirth || null,
        gender: user.gender || "",
        address: user.address || "",
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({
        message: "Invalid email or password",
      });
    }

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


// ==========================================
// GET PROFILE
// ==========================================

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(
      req.user._id
    )
      .select("-password")
      .populate("classroom")
      .populate("subjects");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(user);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


// ==========================================
// UPDATE PROFILE
// ==========================================

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(
      req.user._id
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }


    // Name
    if (req.body.name) {
      user.name = req.body.name;
    }


    // Phone
    if (req.body.phone !== undefined) {
      user.phone = req.body.phone;
    }


    // Date of Birth
    if (req.body.dateOfBirth !== undefined) {
      user.dateOfBirth =
        req.body.dateOfBirth || null;
    }


    // Gender
    if (req.body.gender !== undefined) {
      user.gender =
        req.body.gender || undefined;
    }


    // Address
    if (req.body.address !== undefined) {
      user.address = req.body.address;
    }


    // Password
    if (
      req.body.password &&
      req.body.password.trim()
    ) {
      user.password = req.body.password;
    }


    // Profile photo
    if (req.file) {

      // Delete old photo
      if (user.avatar) {
        const oldPhotoPath = path.join(
          __dirname,
          "..",
          user.avatar
        );

        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }

      user.avatar =
        `/uploads/${req.file.filename}`;
    }


    await user.save();


    const updatedUser =
      await User.findById(user._id)
        .select("-password")
        .populate("classroom")
        .populate("subjects");


    res.json(updatedUser);

  } catch (error) {
    console.error(
      "UPDATE PROFILE ERROR:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
};