const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const validateEnv = require("./config/env");
const announcementRoutes = require("./routes/announcementRoutes");
dotenv.config();

// Validate environment variables
validateEnv();

// Connect to MongoDB
connectDB();

const app = express();

// ==========================================
// SECURITY HEADERS (Helmet)
// ==========================================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// ==========================================
// TRUST PROXY (Required for Render & Reverse Proxies)
// ==========================================
app.set("trust proxy", 1);

// ==========================================
// CORS
// ==========================================
const configuredOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const defaultAllowedOrigins = [
  "https://student-portal-phi-five.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5000",
  "https://localhost",
  "capacitor://localhost",
  "http://localhost",
];

const allowedOrigins = Array.from(
  new Set([...configuredOrigins, ...defaultAllowedOrigins])
);

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow mobile apps, curl, native requests without origin

  if (allowedOrigins.includes(origin)) return true;

  // Allow localhost with any port
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;

  // Allow Capacitor / Ionic origins
  if (/^capacitor:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^ionic:\/\/localhost(:\d+)?$/.test(origin)) return true;

  // Allow local LAN IPs (for mobile devices on same Wi-Fi)
  if (/^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)) return true;

  // Allow Vercel preview & production deployments
  if (origin.endsWith(".vercel.app")) return true;

  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
  })
);

// ==========================================
// RATE LIMITING
// ==========================================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});

app.use("/api/auth/login", authLimiter);

// ==========================================
// BODY PARSER
// ==========================================
app.use(express.json());

// ==========================================
// STATIC UPLOADS
// ==========================================
app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads"),
    {
      maxAge: "7d",
      immutable: true,
    }
  )
);

// ==========================================
// ROUTES
// ==========================================
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/marks", require("./routes/markRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/announcements", announcementRoutes);
app.use("/api/assignments", require("./routes/assignmentRoutes"));
app.use("/api/submissions", require("./routes/submissionRoutes"));
app.use("/api/timetable", require("./routes/timetableRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/teacher", require("./routes/teacherRoutes"));
app.use("/api/teaching-assignments", require("./routes/teachingAssignmentRoutes"));
app.use("/api/classrooms", require("./routes/classroomRoutes"));
app.use("/api/subjects", require("./routes/subjectRoutes"));
app.use("/api/school-settings", require("./routes/schoolSettingsRoutes"));
app.use("/api/teacher-attendance", require("./routes/teacherAttendanceRoutes"));

// ==========================================
// HEALTH / ROOT ENDPOINT
// ==========================================
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Student Portal API is running",
  });
});

// ==========================================
// 404 HANDLER
// ==========================================
app.use((req, res) => {
  res.status(404).json({
    message: `API Endpoint Not Found: ${req.originalUrl}`,
  });
});

// ==========================================
// MULTER / UPLOAD ERRORS
// ==========================================
app.use((err, req, res, next) => {
  if (err.name === "MulterError" || err.name === "FileTypeError") {
    return res.status(400).json({
      message: err.message,
    });
  }

  next(err);
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err.message);

  // Show stack trace only during development
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  const statusCode = err.status || 500;

  res.status(statusCode).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message || "Internal Server Error",
  });
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running in ${
      process.env.NODE_ENV || "development"
    } mode on port ${PORT}`
  );
});