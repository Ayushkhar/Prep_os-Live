/* PrepOS — Complete Client Application
   Powered by Groq (Llama 3.1 70B) — 14,400 req/day free, no quota issues
   ========================================================================= */

"use strict";

/* ─── State ─── */
let currentUser = null;
let selectedExam = null;
let socket = null;
let currentMockTest = null;
let activeQuestionIndex = 0;
let selectedOption = null;
let mockTimerInterval = null;
let mockTimeRemaining = 900; // 15 minutes
let nexusCountdownInterval = null;

/* ─── API Base URLs ─── */
const USER_API = "/api/v1/users";
const EXAM_API = "/api/v1/exams";

/* ─── DOM Selectors (all lazy — fetched when needed to avoid null errors) ─── */
const $ = id => document.getElementById(id);

/* ─── Toast Notification ─── */
function showToast(message, type = "success") {
    const toast = $("app-toast");
    if (!toast) return;
    toast.innerText = message;
    toast.className = `show ${type}`;
    setTimeout(() => { toast.className = ""; }, 4000);
}

/* ─── Markdown Parser ─── */
function formatMarkdown(text) {
    if (!text) return "";
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    html = html.replace(/```(?:[a-zA-Z0-9]+)?\n?([\s\S]*?)```/g, (_, code) =>
        `<pre><code>${code.trim()}</code></pre>`);
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");
    html = html.replace(/^[-*] (.*$)/gim, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>)/gims, "<ul>$1</ul>");
    html = html.replace(/<\/ul>\s*<ul>/gim, "");
    html = html.replace(/\n\n/g, "<br><br>");
    html = html.replace(/\n/g, "<br>");
    return `<div class="md-content">${html}</div>`;
}

/* ─── Panel Switcher ─── */
function showPanel(panelId) {
    document.querySelectorAll(".page-panel").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));

    const panel = $(panelId);
    if (panel) panel.classList.add("active");

    document.querySelectorAll(".tab-btn").forEach(b => {
        if (b.dataset.target === panelId) b.classList.add("active");
    });
}

/* ══════════════════════════════════
   AUTHENTICATION
══════════════════════════════════ */

$("tab-login-toggle").addEventListener("click", () => {
    $("tab-login-toggle").classList.add("active");
    $("tab-register-toggle").classList.remove("active");
    $("login-form").style.display = "block";
    $("register-form").style.display = "none";
});

$("tab-register-toggle").addEventListener("click", () => {
    $("tab-register-toggle").classList.add("active");
    $("tab-login-toggle").classList.remove("active");
    $("register-form").style.display = "block";
    $("login-form").style.display = "none";
});

$("register-form").addEventListener("submit", async e => {
    e.preventDefault();
    const username = $("register-username").value.trim();
    const email = $("register-email").value.trim();
    const password = $("register-password").value;
    const btn = e.target.querySelector("button[type=submit]");
    btn.innerHTML = `<span class="btn-spinner"></span>Creating account...`;
    btn.disabled = true;

    try {
        const res = await fetch(`${USER_API}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (data.success) {
            showToast("Account created! Signing you in...", "success");
            await performLogin(username, password);
        } else {
            showToast(data.message || "Registration failed", "danger");
        }
    } catch {
        showToast("Server error during registration.", "danger");
    } finally {
        btn.innerHTML = "Create Account";
        btn.disabled = false;
    }
});

$("login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const username = $("login-username").value.trim();
    const password = $("login-password").value;
    const btn = e.target.querySelector("button[type=submit]");
    btn.innerHTML = `<span class="btn-spinner"></span>Signing in...`;
    btn.disabled = true;
    await performLogin(username, password);
    btn.innerHTML = "Sign In";
    btn.disabled = false;
});

const guestBtn = $("btn-guest-login");
if (guestBtn) {
    guestBtn.addEventListener("click", async () => {
        guestBtn.innerHTML = `<span class="btn-spinner"></span>Signing in as Guest...`;
        guestBtn.disabled = true;
        await performGuestLogin();
        guestBtn.innerHTML = `
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            Continue as Guest
        `;
        guestBtn.disabled = false;
    });
}

async function performGuestLogin() {
    try {
        const res = await fetch(`${USER_API}/guest-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });
        const data = await res.json();
        if (data.success) {
            currentUser = data.data.user;
            sessionStorage.setItem("accessToken", data.data.accessToken);
            showToast("Logged in as Guest!", "success");
            enterDashboard();
        } else {
            showToast(data.message || "Guest login failed", "danger");
        }
    } catch {
        showToast("Cannot reach server. Is the backend running?", "danger");
    }
}

async function performLogin(username, password) {
    try {
        const payload = username.includes("@") ? { email: username, password } : { username, password };
        const res = await fetch(`${USER_API}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            currentUser = data.data.user;
            sessionStorage.setItem("accessToken", data.data.accessToken);
            showToast(`Welcome back, ${currentUser.username}!`, "success");
            enterDashboard();
        } else {
            showToast(data.message || "Invalid credentials", "danger");
        }
    } catch {
        showToast("Cannot reach server. Is the backend running?", "danger");
    }
}

$("btn-logout").addEventListener("click", async () => {
    try { await fetch(`${USER_API}/logout`, { method: "POST" }); } catch {}
    currentUser = null;
    selectedExam = null;
    sessionStorage.removeItem("accessToken");
    if (socket) { socket.disconnect(); socket = null; }
    clearInterval(mockTimerInterval);
    clearInterval(nexusCountdownInterval);
    $("auth-section").style.display = "flex";
    $("dashboard-section").style.display = "none";
    showToast("Signed out successfully.", "success");
});

function enterDashboard() {
    $("auth-section").style.display = "none";
    $("dashboard-section").style.display = "flex";
    $("user-display-name").innerText = currentUser.username;
    $("user-avatar").innerText = currentUser.username[0].toUpperCase();
    loadExamsList();
    showPanel("page-setup");
}

/* ─── Check session on load ─── */
async function checkAuthStatus() {
    const token = sessionStorage.getItem("accessToken");
    if (!token) return;
    try {
        const res = await fetch(`${USER_API}/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            currentUser = data.data;
            enterDashboard();
        }
    } catch {}
}

/* ══════════════════════════════════
   EXAMS LIST (Sidebar)
══════════════════════════════════ */

async function loadExamsList() {
    const token = sessionStorage.getItem("accessToken");
    const container = $("exams-list-container");
    container.innerHTML = `<div class="skeleton" style="height:38px;margin-bottom:6px;"></div><div class="skeleton" style="height:38px;"></div>`;

    try {
        const res = await fetch(`${EXAM_API}/list`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        container.innerHTML = "";

        if (data.success && data.data.length > 0) {
            data.data.forEach(exam => {
                const item = document.createElement("div");
                item.className = "exam-item";
                item.dataset.examId = exam._id;
                item.innerHTML = `
                    <span class="exam-item-name">${exam.examName}</span>
                    <span class="exam-item-meta">${exam.duration}h study plan</span>
                `;
                item.addEventListener("click", () => selectExam(exam));
                container.appendChild(item);
            });
        } else {
            container.innerHTML = `<p style="color:var(--text-muted);font-size:0.78rem;padding:8px 4px;">No exams yet. Configure one above!</p>`;
        }
    } catch {
        container.innerHTML = `<p style="color:var(--color-danger);font-size:0.78rem;padding:8px 4px;">Error loading exams.</p>`;
    }
}

function selectExam(exam) {
    selectedExam = exam;
    document.querySelectorAll(".exam-item").forEach(i => i.classList.remove("active"));
    const item = document.querySelector(`[data-exam-id="${exam._id}"]`);
    if (item) item.classList.add("active");

    $("active-exam-name").innerText = exam.examName;
    $("active-exam-duration").innerText = `${exam.duration} hours study plan · Start: ${exam.starttime}`;
    $("main-header").style.display = "flex";

    showPanel("page-strategy");
    renderStrategyTab();
    resetMockExamTab();
    currentMockTest = null;
}

$("btn-sidebar-setup").addEventListener("click", () => {
    selectedExam = null;
    $("main-header").style.display = "none";
    document.querySelectorAll(".exam-item").forEach(i => i.classList.remove("active"));
    showPanel("page-setup");
});

/* ══════════════════════════════════
   FILE INPUTS
══════════════════════════════════ */

$("syllabus-file").addEventListener("change", e => {
    $("syllabus-file-label").innerText = e.target.files[0]?.name || "Choose Syllabus File";
});

$("pyq-files").addEventListener("change", e => {
    const files = Array.from(e.target.files);
    $("pyq-files-label").innerText = files.length ? `${files.length} PYQ File(s) Selected` : "Add PYQs";
    $("pyq-preview").innerText = files.map(f => f.name).join(", ");
});

$("notes-files").addEventListener("change", e => {
    const files = Array.from(e.target.files);
    $("notes-files-label").innerText = files.length ? `${files.length} Notes Selected` : "Add Notes";
    $("notes-preview").innerText = files.map(f => f.name).join(", ");
});

/* ══════════════════════════════════
   EXAM SETUP & STRATEGY GENERATION
══════════════════════════════════ */

$("generate-strategy-btn").addEventListener("click", async () => {
    const examName = $("exam-name").value.trim();
    const duration = $("exam-duration").value.trim();
    const starttime = $("exam-start").value;

    if (!examName || !duration) {
        showToast("Please fill in exam name and study duration.", "warning");
        return;
    }

    const btn = $("generate-strategy-btn");
    btn.innerHTML = `<span class="btn-spinner"></span>Building your strategy...`;
    btn.disabled = true;

    $("loading-spinner").style.display = "flex";
    $("page-setup").classList.remove("active");

    const token = sessionStorage.getItem("accessToken");
    const formData = new FormData();
    formData.append("examName", examName);
    formData.append("duration", duration);
    formData.append("starttime", starttime);
    formData.append("syllabusText", $("syllabus-text").value.trim());
    formData.append("customInstruction", $("custom-instructions").value.trim());

    const syllabusFile = $("syllabus-file").files[0];
    if (syllabusFile) formData.append("syllabus", syllabusFile);

    Array.from($("pyq-files").files).forEach(f => formData.append("pyq", f));
    Array.from($("notes-files").files).forEach(f => formData.append("attachment", f));

    try {
        const res = await fetch(`${EXAM_API}/setup`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });
        const data = await res.json();

        $("loading-spinner").style.display = "none";
        btn.innerHTML = "Generate AI Study Strategy";
        btn.disabled = false;

        if (data.success) {
            showToast("Strategy generated successfully!", "success");
            await loadExamsList();
            selectExam(data.data);
        } else {
            showToast(data.message || "Failed to generate strategy", "danger");
            showPanel("page-setup");
        }
    } catch (err) {
        $("loading-spinner").style.display = "none";
        btn.innerHTML = "Generate Study Strategy";
        btn.disabled = false;
        showToast(err.message || "Failed to generate strategy. Please check your network connection.", "danger");
        showPanel("page-setup");
    }
});

/* ══════════════════════════════════
   STRATEGY FLOWCHART (Tree)
══════════════════════════════════ */

function renderStrategyTab() {
    if (!selectedExam) return;
    const container = $("tree-flowchart-container");
    const tipsSection = $("tips-section");

    let strategy;
    try {
        strategy = typeof selectedExam.strategy === "string"
            ? JSON.parse(selectedExam.strategy)
            : selectedExam.strategy;
    } catch {
        strategy = null;
    }

    if (!strategy || !strategy.milestones) {
        container.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:60px 20px;font-size:0.9rem;">No strategy data available. Please regenerate the exam.</div>`;
        return;
    }

    // Update summary
    if (strategy.summary) {
        $("strategy-summary").innerText = strategy.summary;
    }

    // Restore saved checkbox states from localStorage
    const examId = selectedExam._id;
    const savedStates = {};
    try {
        const raw = localStorage.getItem(`exam-tasks-${examId}`);
        if (raw) Object.assign(savedStates, JSON.parse(raw));
    } catch {}

    // Build flowchart HTML
    let html = "";

    // ROOT NODE
    html += `
        <div class="tree-root-card">
            <div class="tree-root-title">${selectedExam.examName}</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px;">${selectedExam.duration}h Total Study Plan</div>
            <div class="tree-progress-track">
                <div class="tree-progress-fill" id="tree-overall-progress-bar"></div>
            </div>
            <div class="tree-progress-label" id="tree-overall-progress-text">0% completed</div>
        </div>
        <div class="tree-connector-v"></div>
    `;

    // MILESTONE BRANCHES
    html += `<div class="tree-branches">`;

    // Group schedule items by milestone
    const schedule = strategy.schedule || [];
    const milestones = strategy.milestones || [];

    // Distribute days across milestones
    const perMilestone = Math.ceil(schedule.length / milestones.length);

    milestones.forEach((ms, mIdx) => {
        const daySlice = schedule.slice(mIdx * perMilestone, (mIdx + 1) * perMilestone);
        const milestoneId = `milestone-${examId}-${mIdx}`;

        html += `
            <div class="tree-branch-node">
                <div class="tree-branch-connector"></div>
                <div class="milestone-card" id="${milestoneId}">
                    <div class="milestone-card-header">
                        <span class="milestone-card-badge">Phase ${mIdx + 1}</span>
                        <span class="milestone-progress-indicator">0%</span>
                    </div>
                    <div class="milestone-card-title">${ms.title}</div>
                    <div class="milestone-card-desc">${ms.description}</div>
                    <div class="milestone-mini-progress-track">
                        <div class="milestone-mini-progress-fill"></div>
                    </div>
                </div>
                <div class="day-nodes-list" style="padding-left:20px;padding-top:4px;">
        `;

        daySlice.forEach((day, dIdx) => {
            const dayId = `day-${mIdx}-${dIdx}`;
            html += `
                <div class="day-connector"></div>
                <div class="day-node-card" id="${dayId}">
                    <div class="day-node-header">
                        <span class="day-node-title">${day.day}</span>
                        <span class="day-node-duration">${day.durationHours}h</span>
                    </div>
                    <div class="day-node-topic">${day.topic}</div>
                    <ul class="day-node-tasks">
            `;

            (day.tasks || []).forEach((task, tIdx) => {
                const taskId = `task-${mIdx}-${dIdx}-${tIdx}`;
                const isChecked = savedStates[`${examId}-${taskId}`] === true;
                html += `
                    <li class="day-node-task-item${isChecked ? " checked" : ""}">
                        <input type="checkbox" id="${taskId}"
                            data-milestone="${milestoneId}"
                            data-task-id="${examId}-${taskId}"
                            ${isChecked ? "checked" : ""}
                            onchange="toggleTaskCheckbox(this)">
                        <label for="${taskId}">${task}</label>
                    </li>
                `;
            });

            html += `</ul></div>`;
        });

        html += `</div></div>`;
    });

    html += `</div>`;
    container.innerHTML = html;

    // Render tips
    if (strategy.tips && strategy.tips.length > 0) {
        tipsSection.innerHTML = `
            <div class="tips-section">
                <h4>Expert Tips</h4>
                <div class="tips-list">
                    ${strategy.tips.map(tip => `
                        <div class="tip-item">
                            <div class="tip-bullet"></div>
                            <span>${tip}</span>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
    } else {
        tipsSection.innerHTML = "";
    }

    // Update progress bars
    updateFlowchartProgress();
}

/* Global checkbox toggle — called from inline onchange */
window.toggleTaskCheckbox = function(checkbox) {
    const li = checkbox.closest(".day-node-task-item");
    const taskKey = checkbox.dataset.taskId;

    if (checkbox.checked) {
        li.classList.add("checked");
    } else {
        li.classList.remove("checked");
    }

    // Persist to localStorage
    if (selectedExam) {
        const examId = selectedExam._id;
        let saved = {};
        try { saved = JSON.parse(localStorage.getItem(`exam-tasks-${examId}`) || "{}"); } catch {}
        saved[taskKey] = checkbox.checked;
        localStorage.setItem(`exam-tasks-${examId}`, JSON.stringify(saved));
    }

    updateFlowchartProgress();
};

function updateFlowchartProgress() {
    const allCheckboxes = Array.from(document.querySelectorAll("#tree-flowchart-container input[type='checkbox']"));
    if (allCheckboxes.length === 0) return;

    const totalChecked = allCheckboxes.filter(cb => cb.checked).length;
    const overallPct = Math.round((totalChecked / allCheckboxes.length) * 100);

    const bar = $("tree-overall-progress-bar");
    const label = $("tree-overall-progress-text");
    if (bar) bar.style.width = `${overallPct}%`;
    if (label) label.innerText = `${overallPct}% completed`;

    // Day cards
    document.querySelectorAll(".day-node-card").forEach(card => {
        const cbs = Array.from(card.querySelectorAll("input[type='checkbox']"));
        if (!cbs.length) return;
        const allDone = cbs.every(cb => cb.checked);
        card.classList.toggle("completed-day", allDone);
    });

    // Milestone cards
    document.querySelectorAll(".milestone-card").forEach(card => {
        const msId = card.id;
        const msCbs = allCheckboxes.filter(cb => cb.dataset.milestone === msId);
        if (!msCbs.length) return;

        const msChecked = msCbs.filter(cb => cb.checked).length;
        const msPct = Math.round((msChecked / msCbs.length) * 100);

        const indicator = card.querySelector(".milestone-progress-indicator");
        const fill = card.querySelector(".milestone-mini-progress-fill");
        if (indicator) indicator.innerText = `${msPct}%`;
        if (fill) fill.style.width = `${msPct}%`;

        card.classList.toggle("completed-branch", msPct === 100);
        card.classList.toggle("active-branch", msPct > 0 && msPct < 100);
    });
}

/* ══════════════════════════════════
   TAB SWITCHING (with actions)
══════════════════════════════════ */

document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        showPanel(target);

        if (target === "page-chat") {
            startNexusCountdown();
        }
        if (target === "page-mock" && !currentMockTest) {
            loadMockQuestions();
        }
    });
});

/* ══════════════════════════════════
   QA CHAT — Nexus Redirect
══════════════════════════════════ */

function startNexusCountdown() {
    clearInterval(nexusCountdownInterval);
    let secs = 3;
    const el = $("nexus-countdown");
    if (el) el.innerText = `Redirecting in ${secs}s...`;

    nexusCountdownInterval = setInterval(() => {
        secs--;
        if (el) el.innerText = secs > 0 ? `Redirecting in ${secs}s...` : "Opening Project Nexus...";
        if (secs <= 0) {
            clearInterval(nexusCountdownInterval);
            window.open("https://nexus.suryanshkhare.online", "_blank");
        }
    }, 1000);
}

/* ══════════════════════════════════
   DOUBT SOLVER
══════════════════════════════════ */

$("submit-doubt-btn").addEventListener("click", async () => {
    const doubt = $("doubt-input").value.trim();
    if (!doubt) { showToast("Please enter a doubt or question.", "warning"); return; }
    if (!selectedExam) { showToast("Select an exam first.", "warning"); return; }

    const btn = $("submit-doubt-btn");
    btn.innerHTML = `<span class="btn-spinner"></span>Resolving...`;
    btn.disabled = true;

    $("doubt-solution-container").innerHTML = `
        <div class="loader-wrapper">
            <div class="spinner"></div>
            <p style="color:var(--text-secondary);font-size:0.85rem;">Working on your explanation...</p>
        </div>
    `;

    const token = sessionStorage.getItem("accessToken");
    try {
        const res = await fetch(`${EXAM_API}/doubt/${selectedExam._id}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ doubt })
        });
        const data = await res.json();

        if (data.success) {
            $("doubt-solution-container").innerHTML = `
                <div style="border-bottom:1px solid var(--border-color);padding-bottom:12px;margin-bottom:18px;">
                    <h3 style="font-weight:700;font-size:0.95rem;letter-spacing:-0.2px;">Explanation</h3>
                </div>
                ${formatMarkdown(data.data.answer)}
            `;
            $("doubt-input").value = "";
            showToast("Explanation ready!", "success");
        } else {
            showToast(data.message || "Failed to resolve doubt", "danger");
            resetDoubtState();
        }
    } catch {
        showToast("Network error while resolving doubt.", "danger");
        resetDoubtState();
    } finally {
        btn.innerHTML = "Get Explanation";
        btn.disabled = false;
    }
});

function resetDoubtState() {
    $("doubt-solution-container").innerHTML = `
        <div class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
            <span style="font-weight:600;font-size:0.9rem;">No doubt submitted yet</span>
            <p style="font-size:0.78rem;max-width:220px;text-align:center;">Submit a query on the left to get an AI-powered explanation here.</p>
        </div>
    `;
}

/* ══════════════════════════════════
   MOCK EXAM
══════════════════════════════════ */

function resetMockExamTab() {
    clearInterval(mockTimerInterval);
    const quizCard = $("mock-quiz-card");
    const resultCard = $("mock-result-card");
    if (quizCard) quizCard.style.display = "flex";
    if (resultCard) resultCard.style.display = "none";
    const qc = $("question-container");
    if (qc) qc.innerHTML = "Initializing mock test...";
    const opts = $("mock-options");
    if (opts) opts.innerHTML = "";
    const checkBtn = $("check-answer-btn");
    const prevBtn = $("prev-btn");
    const nextBtn = $("next-btn");
    const expCard = $("explanation");
    if (checkBtn) checkBtn.disabled = true;
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    if (expCard) expCard.style.display = "none";
    currentMockTest = null;
    activeQuestionIndex = 0;
    mockTimeRemaining = 900;
}

async function loadMockQuestions() {
    if (!selectedExam) return;
    const token = sessionStorage.getItem("accessToken");

    const qc = $("question-container");
    if (qc) qc.innerHTML = `<div class="loader-wrapper" style="padding:20px;"><div class="spinner"></div><p style="color:var(--text-secondary);font-size:0.82rem;margin-top:8px;">Preparing your practice questions...</p></div>`;

    try {
        const res = await fetch(`${EXAM_API}/mock/${selectedExam._id}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            currentMockTest = data.data;
            if (currentMockTest.completed) {
                renderMockResults();
            } else {
                activeQuestionIndex = 0;
                mockTimeRemaining = 900;
                startMockTimer();
                renderMockQuestion();
            }
        } else {
            showToast("Failed to load mock exam.", "danger");
        }
    } catch {
        showToast("Error loading mock test.", "danger");
    }
}

function startMockTimer() {
    clearInterval(mockTimerInterval);
    updateTimerDisplay();
    mockTimerInterval = setInterval(() => {
        mockTimeRemaining--;
        updateTimerDisplay();
        if (mockTimeRemaining <= 0) {
            clearInterval(mockTimerInterval);
            showToast("Time's up! Submitting your exam...", "warning");
            submitFinalMockScore();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const el = $("mock-timer");
    const wrapper = el?.parentElement;
    if (!el) return;
    const mins = Math.floor(mockTimeRemaining / 60);
    const secs = mockTimeRemaining % 60;
    el.innerText = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    if (wrapper) wrapper.classList.toggle("urgent", mockTimeRemaining < 120);
}

function renderMockQuestion() {
    if (!currentMockTest || !currentMockTest.questions[activeQuestionIndex]) return;
    const q = currentMockTest.questions[activeQuestionIndex];
    const total = currentMockTest.questions.length;

    $("mock-question-num").innerText = `Question ${activeQuestionIndex + 1} of ${total}`;
    $("mock-progress-fill").style.width = `${((activeQuestionIndex + 1) / total) * 100}%`;
    $("question-container").innerText = q.question;

    const opts = $("mock-options");
    opts.innerHTML = "";
    selectedOption = null;
    $("check-answer-btn").disabled = true;

    const savedChoice = q.chosen;
    const isChecked = q.checked === true;

    q.options.forEach(optText => {
        const letter = optText.trim()[0];
        const card = document.createElement("div");
        card.className = "mock-option-card";

        if (isChecked) {
            if (letter === q.answer) card.classList.add("correct");
            else if (letter === savedChoice) card.classList.add("incorrect");
        } else if (letter === savedChoice) {
            card.classList.add("selected");
            selectedOption = letter;
            $("check-answer-btn").disabled = false;
        }

        card.innerHTML = `<div class="mock-option-badge">${letter}</div><div class="mock-option-text">${optText}</div>`;

        if (!isChecked) {
            card.addEventListener("click", () => {
                document.querySelectorAll(".mock-option-card").forEach(c => c.classList.remove("selected"));
                card.classList.add("selected");
                selectedOption = letter;
                q.chosen = letter;
                $("check-answer-btn").disabled = false;
            });
        }
        opts.appendChild(card);
    });

    const expCard = $("explanation");
    const expText = $("explanation-text");
    if (isChecked) {
        expText.innerText = q.explanation || "No explanation provided.";
        expCard.style.display = "block";
        $("check-answer-btn").disabled = true;
        $("next-btn").disabled = false;
    } else {
        expCard.style.display = "none";
    }

    $("prev-btn").disabled = activeQuestionIndex === 0;
    $("next-btn").disabled = activeQuestionIndex === total - 1 && !isChecked;
}

$("check-answer-btn").addEventListener("click", () => {
    if (!selectedOption || !currentMockTest) return;
    const q = currentMockTest.questions[activeQuestionIndex];
    q.checked = true;
    q.isCorrect = selectedOption === q.answer;

    document.querySelectorAll(".mock-option-card").forEach(card => {
        const letter = card.querySelector(".mock-option-badge").innerText;
        card.classList.remove("selected");
        if (letter === q.answer) card.classList.add("correct");
        else if (letter === selectedOption) card.classList.add("incorrect");
    });

    $("explanation-text").innerText = q.explanation || "No explanation provided.";
    $("explanation").style.display = "block";
    $("check-answer-btn").disabled = true;
    $("next-btn").disabled = false;
});

$("prev-btn").addEventListener("click", () => {
    if (activeQuestionIndex > 0) { activeQuestionIndex--; renderMockQuestion(); }
});

$("next-btn").addEventListener("click", () => {
    if (!currentMockTest) return;
    if (activeQuestionIndex < currentMockTest.questions.length - 1) {
        activeQuestionIndex++;
        renderMockQuestion();
    } else {
        submitFinalMockScore();
    }
});

async function submitFinalMockScore() {
    clearInterval(mockTimerInterval);
    if (!currentMockTest || !selectedExam) return;
    const score = currentMockTest.questions.filter(q => q.isCorrect).length;
    const token = sessionStorage.getItem("accessToken");
    try {
        const res = await fetch(`${EXAM_API}/mock/${selectedExam._id}/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ score })
        });
        const data = await res.json();
        if (data.success) { currentMockTest = data.data; renderMockResults(); }
    } catch {
        showToast("Error submitting score.", "danger");
    }
}

function renderMockResults() {
    clearInterval(mockTimerInterval);
    $("mock-quiz-card").style.display = "none";
    $("mock-result-card").style.display = "block";

    const score = currentMockTest.score;
    const total = currentMockTest.questions.length;
    $("score-display-value").innerText = `${score}/${total}`;
    const pct = (score / total) * 100;
    const ev = $("score-evaluation");
    const sub = $("score-subtext");

    if (pct >= 80) {
        ev.innerText = "Excellent Preparation!";
        ev.style.color = "var(--color-success)";
        sub.innerText = "Outstanding performance. Keep revising key formulas and maintain this consistency.";
    } else if (pct >= 50) {
        ev.innerText = "Good Progress";
        ev.style.color = "var(--color-primary-light)";
        sub.innerText = "Solid base, but work on speed and accuracy. Solve more PYQs.";
    } else {
        ev.innerText = "Needs More Work";
        ev.style.color = "var(--color-danger)";
        sub.innerText = "Review the strategy flowchart tasks and use the Doubt Solver for weak concepts.";
    }
}

$("btn-restart-mock").addEventListener("click", () => {
    if (!currentMockTest) return;
    currentMockTest.questions.forEach(q => {
        q.chosen = null;
        q.checked = false;
        q.isCorrect = false;
    });
    currentMockTest.completed = false;
    currentMockTest.score = 0;
    $("mock-quiz-card").style.display = "flex";
    $("mock-result-card").style.display = "none";
    activeQuestionIndex = 0;
    mockTimeRemaining = 900;
    startMockTimer();
    renderMockQuestion();
});

/* ══════════════════════════════════
   SAMPLE DATA SYSTEM
══════════════════════════════════ */

const SAMPLE_EXAM = {
    examName: "Operating Systems — CS301 Final Exam",
    duration: "18",
    starttime: "09:00",
    syllabusText: `UNIT 1 — Process Management
- Process concept, Process Control Block (PCB), process states (new, ready, running, waiting, terminated)
- Process Scheduling: FCFS, SJF (preemptive & non-preemptive), Round Robin, Priority Scheduling
- CPU scheduling criteria: CPU utilisation, throughput, turnaround time, waiting time, response time
- Dispatcher, scheduling queues, context switching
- Inter-process Communication (IPC): shared memory, message passing, pipes

UNIT 2 — Threads & Concurrency
- Multithreading models: many-to-one, one-to-one, many-to-many
- Thread libraries: POSIX Pthreads, Java Threads
- Critical Section Problem, Peterson's Solution, Mutex Locks
- Semaphores: counting & binary, implementation
- Classic synchronization problems: Bounded Buffer, Readers-Writers, Dining Philosophers
- Deadlock: conditions, Resource Allocation Graph, Banker's Algorithm, detection & recovery

UNIT 3 — Memory Management
- Logical vs Physical address space, Memory Management Unit (MMU)
- Contiguous allocation: fixed/variable partitions, fragmentation, compaction
- Paging: page table, TLB, effective memory access time
- Segmentation, segmentation with paging
- Virtual memory: demand paging, page fault handling, copy-on-write
- Page replacement algorithms: FIFO, Optimal (OPT), LRU, Clock algorithm
- Thrashing, working set model, prepaging

UNIT 4 — File Systems & I/O
- File concept, file attributes, file operations
- File allocation methods: contiguous, linked, indexed
- Directory structure: single-level, two-level, tree-structured, DAG
- Free space management: bit vector, linked list, grouping
- I/O Hardware: polling, interrupts, DMA
- Disk scheduling: FCFS, SSTF, SCAN, C-SCAN, LOOK, C-LOOK

UNIT 5 — Protection & Security
- Goals of protection, access matrix, capability lists
- OS security: threats (viruses, trojans, denial of service), authentication
- Cryptography basics: symmetric & asymmetric encryption`,
    customInstruction: "Focus heavily on scheduling algorithms and page replacement — these appear most frequently in PYQs. Include numeric examples for Banker's Algorithm and page replacement."
};

function loadSampleData() {
    // Fill text fields
    $("exam-name").value = SAMPLE_EXAM.examName;
    $("exam-duration").value = SAMPLE_EXAM.duration;
    $("exam-start").value = SAMPLE_EXAM.starttime;
    $("syllabus-text").value = SAMPLE_EXAM.syllabusText;
    $("custom-instructions").value = SAMPLE_EXAM.customInstruction;

    // ── Inject sample FILES into file inputs via DataTransfer ──
    // Syllabus file
    const syllabusContent = `OPERATING SYSTEMS — CS301 SYLLABUS

UNIT 1: PROCESS MANAGEMENT
Process concept, PCB, process states (new, ready, running, waiting, terminated).
Scheduling: FCFS, SJF (preemptive/non-preemptive), Round Robin, Priority.
CPU scheduling criteria: utilization, throughput, turnaround time, waiting time.
Context switching, dispatcher, scheduling queues.
IPC: shared memory, message passing, pipes.

UNIT 2: THREADS & CONCURRENCY  
Multithreading models: many-to-one, one-to-one, many-to-many.
Critical Section Problem, Peterson's Solution, Mutex Locks, Semaphores.
Deadlock: Banker's Algorithm, Resource Allocation Graph, detection & recovery.
Classic problems: Bounded Buffer, Readers-Writers, Dining Philosophers.

UNIT 3: MEMORY MANAGEMENT
Logical vs Physical address space, MMU.
Paging: page table, TLB, effective memory access time.
Virtual memory: demand paging, page fault, copy-on-write.
Page replacement: FIFO, OPT, LRU, Clock algorithm. Thrashing.

UNIT 4: FILE SYSTEMS & I/O
File allocation: contiguous, linked, indexed.
Directory: single-level, two-level, tree-structured.
Disk scheduling: FCFS, SSTF, SCAN, C-SCAN, LOOK.

UNIT 5: PROTECTION & SECURITY
Access matrix, capability lists, authentication.
Cryptography: symmetric & asymmetric encryption.`;

    const pyqContent = `OPERATING SYSTEMS — PREVIOUS YEAR QUESTIONS

2023 PAPER:
Q1. Explain the Banker's Algorithm for deadlock avoidance with a numerical example. (10 marks)
Q2. Compare FCFS, SJF, and Round Robin scheduling with examples. Calculate average waiting time. (10 marks)
Q3. Explain page replacement algorithms FIFO, LRU, and Optimal with a reference string: 7,0,1,2,0,3,0,4,2,3,0,3,2,1,2,0,1,7,0,1 and 3 frames. (12 marks)

2022 PAPER:
Q1. What is thrashing? How does the working set model prevent it? (8 marks)
Q2. Explain Peterson's solution for the critical section problem. What are its limitations? (8 marks)
Q3. A system has 4 processes and 3 resource types. Given Allocation, Max, and Available matrices, determine if the system is in a safe state using Banker's Algorithm. (12 marks)

2021 PAPER:
Q1. Explain paging with a neat diagram. How is logical address converted to physical address? (10 marks)
Q2. What is a semaphore? Solve the Readers-Writers problem using semaphores. (10 marks)
Q3. Explain SCAN and C-SCAN disk scheduling with disk head at 50, requests: 82,170,43,140,24,16,190. (8 marks)`;

    const notesContent = `OPERATING SYSTEMS — CLASS NOTES

KEY FORMULAS:
- Average Waiting Time = Sum of all waiting times / n
- TLB Hit Effective Access Time = hit_ratio * (TLB_time + mem_time) + (1-hit_ratio) * (TLB_time + 2*mem_time)
- Page Fault Rate: minimised by increasing frames (except FIFO — Belady's Anomaly)

IMPORTANT DEFINITIONS:
- Deadlock: circular wait among processes, each waiting for a resource held by another
- Thrashing: excessive paging causing CPU utilisation to drop — add more frames or reduce multiprogramming
- Banker's Algorithm: grant resource only if system stays in SAFE STATE after allocation

QUICK REVISION:
1. FCFS — non-preemptive, simple, convoy effect
2. SJF — optimal average waiting time, starvation possible
3. Round Robin — preemptive, best response time, q=time quantum
4. LRU — best practical page replacement, approximated by Clock algo
5. Deadlock conditions: mutual exclusion, hold & wait, no preemption, circular wait`;

    // Helper to attach file to input
    function attachFile(inputId, labelId, filename, content, mimeType = "text/plain") {
        try {
            const blob = new Blob([content], { type: mimeType });
            const file = new File([blob], filename, { type: mimeType });
            const dt = new DataTransfer();
            dt.items.add(file);
            $(inputId).files = dt.files;
            $(labelId).innerText = filename;
        } catch (e) {
            // DataTransfer not supported in all browsers — fallback gracefully
            $(labelId).innerText = `${filename} (loaded in memory)`;
        }
    }

    function attachMultipleFiles(inputId, labelId, previewId, files) {
        try {
            const dt = new DataTransfer();
            files.forEach(({ name, content }) => {
                const blob = new Blob([content], { type: "text/plain" });
                dt.items.add(new File([blob], name, { type: "text/plain" }));
            });
            $(inputId).files = dt.files;
            $(labelId).innerText = `${files.length} Sample File(s) Loaded`;
            $(previewId).innerText = files.map(f => f.name).join(", ");
        } catch (e) {
            $(labelId).innerText = `${files.length} files (loaded in memory)`;
        }
    }

    attachFile("syllabus-file", "syllabus-file-label", "os_syllabus.txt", syllabusContent);
    attachMultipleFiles("pyq-files", "pyq-files-label", "pyq-preview", [
        { name: "pyq_2023.txt", content: pyqContent },
        { name: "pyq_2022_snippets.txt", content: "PYQ 2022 — See main PYQ file for full content." }
    ]);
    attachMultipleFiles("notes-files", "notes-files-label", "notes-preview", [
        { name: "class_notes.txt", content: notesContent }
    ]);

    // Show notice & highlight button
    $("sample-loaded-notice").style.display = "flex";
    $("btn-load-sample").classList.add("active-demo");
    $("btn-use-real").classList.remove("active-demo");

    showToast("Sample data + 4 files loaded! Click Generate to test.", "success");
}

function clearFormData() {
    $("exam-name").value = "";
    $("exam-duration").value = "";
    $("exam-start").value = "09:00";
    $("syllabus-text").value = "";
    $("custom-instructions").value = "";
    $("syllabus-file").value = "";
    $("syllabus-file-label").innerText = "Choose Syllabus File";
    $("pyq-files").value = "";
    $("pyq-files-label").innerText = "Add PYQs (Multiple files)";
    $("pyq-preview").innerText = "";
    $("notes-files").value = "";
    $("notes-files-label").innerText = "Add Notes / Reference Material";
    $("notes-preview").innerText = "";
    $("sample-loaded-notice").style.display = "none";
    $("btn-use-real").classList.add("active-demo");
    $("btn-load-sample").classList.remove("active-demo");
    showToast("Form cleared. Fill in your own exam details.", "success");
}

/* ══════════════════════════════════
   INIT
══════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
    checkAuthStatus();

    // Sample / real data buttons
    const sampleBtn = $("btn-load-sample");
    const realBtn = $("btn-use-real");
    if (sampleBtn) sampleBtn.addEventListener("click", loadSampleData);
    if (realBtn) realBtn.addEventListener("click", clearFormData);
});

