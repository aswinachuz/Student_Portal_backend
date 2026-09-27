const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads");

// Create uploads folder if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname).toLowerCase();

    cb(null, uniqueName);
  },
});

const createUpload = ({ allowedExtensions, maxSizeBytes, errorMessage }) => {
  return multer({
    storage,
    limits: {
      fileSize: maxSizeBytes,
    },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedExtensions.includes(ext)) {
        cb(null, true);
      } else {
        const error = new Error(errorMessage);
        error.name = "FileTypeError";
        cb(error, false);
      }
    },
  });
};

// General document & image uploads (10 MB limit)
const upload = createUpload({
  allowedExtensions: [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"],
  maxSizeBytes: 10 * 1024 * 1024,
  errorMessage: "Only PDF, DOC, DOCX, JPG, JPEG and PNG files are allowed.",
});

// Image-only uploads for avatars, logos (5 MB limit)
const imageUpload = createUpload({
  allowedExtensions: [".jpg", ".jpeg", ".png"],
  maxSizeBytes: 5 * 1024 * 1024,
  errorMessage: "Only JPG, JPEG and PNG images are allowed.",
});

module.exports = upload;
module.exports.upload = upload;
module.exports.imageUpload = imageUpload;