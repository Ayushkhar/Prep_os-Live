# PrepOS - Exam Preparation Platform

An AI-powered exam preparation platform where users configure their exam details, upload study materials, and receive a generated study strategy. Includes a QA chat, doubt solver, and mock exam system.

## Tech Stack

- **Backend**: Node.js, Express 5
- **Database**: MongoDB Atlas, Mongoose 9
- **File Uploads**: Multer 2 (disk storage) + Cloudinary (cloud storage)
- **Auth**: JWT (cookie-based)
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Dev Tools**: Nodemon, Prettier

## Features

- **Exam Setup** - Configure exam name, duration, start time. Upload syllabus, previous year papers, and notes.
- **Strategy Generation** - Auto-generates a study strategy based on uploaded materials.
- **QA Chat** - Ask questions related to your exam topics. Includes quick-topic buttons.
- **Doubt Solver** - Submit detailed doubts and get explanations.
- **Mock Exam** - Timed MCQ-based mock tests with answer checking and explanations.
- **User Auth** - Register, login, logout with JWT-based authentication.

## Project Structure

```
Exam prep/
|-- .env                          # Environment variables
|-- index.js                      # Entry point - DB connection + server start
|-- app.js                        # Express app config - CORS, middleware, routes
|-- constants.js                  # DB name constant
|-- package.json
|
|-- client/
|   |-- exam_prp.html             # Frontend - all 5 page sections
|   |-- script.js                 # Frontend logic - form handling, API calls
|   |-- server.js                 # (reserved)
|
|-- server/
    |-- public/
    |   |-- temp/                  # Temporary file upload storage
    |
    |-- src/
        |-- controllers/
        |   |-- exam.controller.js # Exam route handlers
        |
        |-- db/
        |   |-- index.js           # Database connection helper
        |
        |-- middlewares/
        |   |-- multer.middleware.js # Multer disk storage config
        |
        |-- models/
        |   |-- exam.model.js      # Mongoose schema for exams
        |
        |-- routes/
        |   |-- exam.routes.js     # Exam API routes
        |   |-- user.routes.js     # User auth routes
        |
        |-- utils/
            |-- asyncHandler.js    # Async wrapper for controllers
            |-- ApiError.js        # Custom error class
            |-- ApiResponse.js     # Standard response class
            |-- cloudinary.js      # Cloudinary upload helper
```

## Setup

### Prerequisites

- Node.js installed
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account

### Installation

```bash
git clone <repo-url>
cd "Exam prep"
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```
PORT=8000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_KEY_NAME=your_cloud_name
```

### Run

```bash
npx nodemon index.js
```

The server starts on `http://localhost:8000`.

## API Routes

### Exam Routes (`/api/v1/exams`)

| Method | Endpoint            | Description                              |
|--------|---------------------|------------------------------------------|
| POST   | `/setup`            | Upload exam details + syllabus/pyq/notes |
| GET    | `/strategy/:examId` | Fetch generated study strategy           |
| POST   | `/chat/:examId`     | Send a question in QA chat               |
| POST   | `/doubt/:examId`    | Submit a doubt                           |
| GET    | `/mock/:examId`     | Fetch mock exam MCQ questions            |

### User Routes (`/api/v1/users`)

| Method | Endpoint    | Description                  |
|--------|-------------|------------------------------|
| POST   | `/register` | Register a new user          |
| POST   | `/login`    | Login and receive JWT        |
| POST   | `/logout`   | Logout (secured, needs JWT)  |
| POST   | `/token`    | Refresh access token         |

## Frontend Pages

The frontend is a single HTML file with 5 sections toggled via navigation:

1. **Setup** - Form with exam config inputs and file uploads
2. **Strategy** - Displays the AI-generated study plan
3. **QA Chat** - Chat interface with text input and quick-topic buttons
4. **Doubt Solver** - Textarea to submit detailed doubts
5. **Mock Exam** - Timed MCQs with prev/next navigation and answer checking

## Author

Suryansh Khare
