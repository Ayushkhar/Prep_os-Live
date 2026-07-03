import {Router} from express;
import { app } from "../../../app";
import express from "express";

const router = express.Router();
// R1
router.route("/setup").post(
    upload.fields([
        {
            name: "syllabus",
            maxCount: 1
        },
        {
            name: "pyq",
            maxCount: 3
        },
        {
            name: "attachment",
            maxCount: 3
        }
    ]),setupexam
    
);
// R2
router.route("/strategy/:examid")
.get(getstrategycontent);
// R3
router.route("/chat/:examid").post(getchats);
// R4
router.route("/doubt/:examid").post(getdoubts);
// R5
router.route("/mock/:examid").get(getmocktest);
