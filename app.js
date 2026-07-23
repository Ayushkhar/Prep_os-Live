import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import examRouter from "./server/src/routes/exam.routes.js";
import userRouter from "./server/src/routes/user.routes.js";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
}));

app.use(express.json({ limit: "16mb" }));
app.use(express.urlencoded({ extended: true, limit: "16mb" }));
app.use(cookieParser());

// Serve static frontend files from client directory
app.use(express.static("client"));
// Serve public uploads
app.use("/public", express.static("server/public"));

// API Routes
app.use("/api/v1/exams", examRouter);
app.use("/api/v1/users", userRouter);

export { app };
