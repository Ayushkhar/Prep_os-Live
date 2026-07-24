import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import { asynchandler } from "../utils/asyncHandler.js";
import { Apierror } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Exam } from "../models/exam.model.js";
import { Chat } from "../models/chat.model.js";
import { MockTest } from "../models/mocktest.model.js";
import { uploadoncloudinary } from "../utils/cloudinary.js";
import { generateStudyStrategy, solveDoubt, generateMockExamQuestions } from "../utils/gemini.js";

// Helper to extract text contents from files (PDF/Text)
const extractTextFromFile = async (filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return "";
    try {
        if (filePath.toLowerCase().endsWith(".pdf")) {
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdf(dataBuffer);
            return pdfData.text || "";
        } else {
            return fs.readFileSync(filePath, "utf-8") || "";
        }
    } catch (error) {
        console.error(`Error extracting text from file ${filePath}:`, error);
        return "";
    }
};

const setupExam = asynchandler(async (req, res) => {
    const { examName, duration, starttime, syllabusText, customInstruction } = req.body;

    if (!examName || !duration || !starttime) {
        throw new Apierror(400, "Exam Name, Duration, and Start Time are required.");
    }

    let concatenatedSyllabusText = syllabusText || "";
    let syllabusFileUrl = "";
    let pyqFilesUrls = [];
    let notesFilesUrls = [];

    // Process syllabus file
    if (req.files?.syllabus?.[0]) {
        const file = req.files.syllabus[0];
        // 1. Extract text
        const extracted = await extractTextFromFile(file.path);
        concatenatedSyllabusText += "\n\n--- Syllabus File Content ---\n" + extracted;
        // 2. Upload to Cloudinary (will delete local file)
        const cloudUpload = await uploadoncloudinary(file.path);
        if (cloudUpload) syllabusFileUrl = cloudUpload.secure_url;
    }

    // Process PYQ files
    if (req.files?.pyq) {
        for (const file of req.files.pyq) {
            const extracted = await extractTextFromFile(file.path);
            concatenatedSyllabusText += "\n\n--- PYQ File Content ---\n" + extracted;
            const cloudUpload = await uploadoncloudinary(file.path);
            if (cloudUpload) pyqFilesUrls.push(cloudUpload.secure_url);
        }
    }

    // Process Attachment/Notes files
    if (req.files?.attachment) {
        for (const file of req.files.attachment) {
            const extracted = await extractTextFromFile(file.path);
            concatenatedSyllabusText += "\n\n--- Notes/Attachment Content ---\n" + extracted;
            const cloudUpload = await uploadoncloudinary(file.path);
            if (cloudUpload) notesFilesUrls.push(cloudUpload.secure_url);
        }
    }

    // Call Gemini to generate study strategy
    console.log("Generating study strategy via Gemini...");
    const strategyPlan = await generateStudyStrategy(
        examName,
        Number(duration),
        starttime,
        concatenatedSyllabusText,
        customInstruction
    );

    const exam = await Exam.create({
        examName,
        duration: Number(duration),
        starttime,
        syllabusText: concatenatedSyllabusText,
        syllabusFile: syllabusFileUrl,
        pyqFiles: pyqFilesUrls,
        notesFiles: notesFilesUrls,
        customInstruction,
        strategy: JSON.stringify(strategyPlan),
        owner: req.user._id
    });

    return res.status(201).json(
        new ApiResponse(201, exam, "Exam set up and study plan generated successfully")
    );
});

const getStrategy = asynchandler(async (req, res) => {
    const { examId } = req.params;
    const exam = await Exam.findOne({ _id: examId, owner: req.user._id });

    if (!exam) {
        throw new Apierror(404, "Exam not found or you do not have permission.");
    }

    let parsedStrategy;
    try {
        parsedStrategy = JSON.parse(exam.strategy);
    } catch (e) {
        parsedStrategy = { summary: exam.strategy };
    }

    return res.status(200).json(
        new ApiResponse(200, parsedStrategy, "Study strategy fetched successfully")
    );
});

const getChats = asynchandler(async (req, res) => {
    const { examId } = req.params;
    const chats = await Chat.find({ exam: examId, user: req.user._id }).sort({ createdAt: 1 });
    return res.status(200).json(
        new ApiResponse(200, chats, "Chat history fetched successfully")
    );
});

const getDoubts = asynchandler(async (req, res) => {
    const { examId } = req.params;
    const { doubt } = req.body;

    if (!doubt) {
        throw new Apierror(400, "Doubt query is required");
    }

    const exam = await Exam.findOne({ _id: examId, owner: req.user._id });
    if (!exam) {
        throw new Apierror(404, "Exam not found");
    }

    const answer = await solveDoubt(doubt, exam.syllabusText);

    return res.status(200).json(
        new ApiResponse(200, { answer }, "Doubt solved successfully")
    );
});

const getMockTest = asynchandler(async (req, res) => {
    const { examId } = req.params;
    const exam = await Exam.findOne({ _id: examId, owner: req.user._id });
    if (!exam) {
        throw new Apierror(404, "Exam not found");
    }

    // Check if mock test already exists
    let mockTest = await MockTest.findOne({ exam: examId, user: req.user._id });

    if (!mockTest) {
        console.log("Generating new mock exam via Gemini...");
        const questions = await generateMockExamQuestions(exam.syllabusText, 5);
        mockTest = await MockTest.create({
            exam: examId,
            user: req.user._id,
            questions,
            score: 0,
            completed: false
        });
    }

    return res.status(200).json(
        new ApiResponse(200, mockTest, "Mock test fetched successfully")
    );
});

const submitMockTestScore = asynchandler(async (req, res) => {
    const { examId } = req.params;
    const { score } = req.body;

    if (score === undefined) {
        throw new Apierror(400, "Score is required");
    }

    const mockTest = await MockTest.findOneAndUpdate(
        { exam: examId, user: req.user._id },
        { score, completed: true },
        { new: true }
    );

    if (!mockTest) {
        throw new Apierror(404, "Mock test not found");
    }

    return res.status(200).json(
        new ApiResponse(200, mockTest, "Mock test score submitted successfully")
    );
});

const getExamsList = asynchandler(async (req, res) => {
    const exams = await Exam.find({ owner: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(
        new ApiResponse(200, exams, "Exams list fetched successfully")
    );
});

export {
    setupExam,
    getStrategy,
    getChats,
    getDoubts,
    getMockTest,
    submitMockTestScore,
    getExamsList
};
