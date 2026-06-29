import express from "express"
import cookieParser from "cookie-parser";
import cors from "cors";
// import examRouter from "exam.routes.js"
// import userRouter from "user.routes.js"
const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}));
app.use(express.static("Public"));
app.use(cookieParser())

app.use("/api/v1/exams",examRouter);
app.use("/api/v1/users",userRouter);

export {app}
