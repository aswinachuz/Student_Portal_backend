const requiredEnvVariables = [
  "MONGO_URI",
  "JWT_SECRET",
  "JWT_EXPIRE",
  "FRONTEND_URL",
];

const validateEnv = () => {
  const missingVariables =
    requiredEnvVariables.filter(
      (variable) => !process.env[variable]
    );

  if (missingVariables.length > 0) {
    console.error(
      "❌ Environment validation failed."
    );

    console.error(
      `Missing variables: ${missingVariables.join(", ")}`
    );

    process.exit(1);
  }

  console.log(
    "✅ Environment variables validated."
  );
};

module.exports = validateEnv;