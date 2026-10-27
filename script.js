
/* ==========================================
   STUDYFLOW — TASKS, PLANNER & FOCUS TIMER
========================================== */

const STORAGE_KEY = "studyflowTasks";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const taskForm = $("#taskForm");
const taskModal = $("#taskModal");
const taskTitleInput = $("#taskTitle");
const taskSubjectInput = $("#taskSubject");
const taskPriorityInput = $("#taskPriority");
const taskDueDateInput = $("#taskDueDate");
const taskNotesInput = $("#taskNotes");
const editTaskIdInput = $("#editTaskId");

let tasks = loadTasks();
let currentView = "dashboard";
let toastTimeout;

// ------------------------------------------
// STORAGE
// ------------------------------------------

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(task =>
      task &&
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      typeof task.completed === "boolean"
    );
  } catch (error) {
    console.error("Could not load StudyFlow tasks:", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Could not save StudyFlow tasks:", error);
    showToast("Couldn't save data. Check your browser storage.");
    return false;
  }
}

// ------------------------------------------
// HELPERS
// ------------------------------------------

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "No due date";

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function isOverdue(task) {
  return Boolean(
    task.dueDate &&
    task.dueDate < getLocalDateString() &&
    !task.completed
  );
}

function showToast(message) {
  const toast = $("#toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function persistAndRender(message) {
  if (!saveTasks()) return;

  renderAll();

  if (message) showToast(message);
}

// ------------------------------------------
// NAVIGATION
// ------------------------------------------

const viewNames = {
  dashboard: "Dashboard",
  tasks: "My Tasks",
  planner: "Study Planner",
  focus: "Focus Room"
};

function navigateTo(view) {
  if (!viewNames[view]) view = "dashboard";

  currentView = view;

  $$(".view-section").forEach(section => {
    section.classList.add("hidden");
  });

  $(`#${view}View`).classList.remove("hidden");

  $$(".nav-link").forEach(link => {
    const active = link.dataset.view === view;

    link.classList.toggle("active", active);

    if (active) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  $("#breadcrumbCurrent").textContent = viewNames[view];
  $("#sidebar").classList.remove("open");

  if (location.hash !== `#${view}`) {
    history.replaceState(null, "", `#${view}`);
  }

  if (view === "tasks") renderTaskManager();
  if (view === "planner") renderPlanner();
}

$$("[data-view]").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    navigateTo(link.dataset.view);
  });
});

$$("[data-go]").forEach(button => {
  button.addEventListener("click", () => {
    navigateTo(button.dataset.go);
  });
});

$("#menuBtn").addEventListener("click", () => {
  $("#sidebar").classList.toggle("open");
});

document.addEventListener("click", event => {
  const sidebar = $("#sidebar");
  const menuButton = $("#menuBtn");

  if (
    window.innerWidth <= 850 &&
    sidebar.classList.contains("open") &&
    !sidebar.contains(event.target) &&
    !menuButton.contains(event.target)
  ) {
    sidebar.classList.remove("open");
  }
});

window.addEventListener("hashchange", () => {
  const view = location.hash.slice(1);
  navigateTo(viewNames[view] ? view : "dashboard");
});

// ------------------------------------------
// TASK MODAL
// ------------------------------------------

function openTaskModal(task = null) {
  taskForm.reset();

  editTaskIdInput.value = task ? task.id : "";

  $("#modalTitle").textContent = task ? "Edit task" : "Create a task";
  $("#saveTaskBtn").textContent = task ? "Save changes" : "Save task";

  taskTitleInput.value = task ? task.title : "";
  taskSubjectInput.value = task ? task.subject : "Mathematics";
  taskPriorityInput.value = task ? task.priority : "Medium";
  taskDueDateInput.value = task ? task.dueDate : "";
  taskNotesInput.value = task ? task.notes : "";

  taskModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  setTimeout(() => taskTitleInput.focus(), 50);
}

function closeTaskModal() {
  taskModal.classList.add("hidden");
  document.body.style.overflow = "";
}

$("#sidebarAddBtn").addEventListener("click", () => openTaskModal());
$("#topAddBtn").addEventListener("click", () => openTaskModal());
$("#taskPageAddBtn").addEventListener("click", () => openTaskModal());
$("#plannerAddBtn").addEventListener("click", () => openTaskModal());

$("#closeModalBtn").addEventListener("click", closeTaskModal);
$("#cancelModalBtn").addEventListener("click", closeTaskModal);

taskModal.addEventListener("click", event => {
  if (event.target === taskModal) closeTaskModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !taskModal.classList.contains("hidden")) {
    closeTaskModal();
  }
});

taskForm.addEventListener("submit", event => {
  event.preventDefault();

  const title = taskTitleInput.value.trim();

  if (!title) {
    showToast("Please enter a task name.");
    taskTitleInput.focus();
    return;
  }

  const existingId = editTaskIdInput.value;
  const existingTask = tasks.find(task => task.id === existingId);

  const taskData = {
    id: existingTask ? existingTask.id : createId(),
    title,
    subject: taskSubjectInput.value,
    priority: taskPriorityInput.value,
    dueDate: taskDueDateInput.value,
    notes: taskNotesInput.value.trim(),
    completed: existingTask ? existingTask.completed : false,
    createdAt: existingTask
      ? existingTask.createdAt
      : new Date().toISOString()
  };

  if (existingTask) {
    tasks = tasks.map(task =>
      task.id === existingId ? taskData : task
    );
  } else {
    tasks.unshift(taskData);
  }

  if (!saveTasks()) return;

  closeTaskModal();
  renderAll();

  showToast(existingTask ? "Task updated successfully!" : "Task added!");
});

// ------------------------------------------
// TASK ACTIONS
// ------------------------------------------

function toggleTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  task.completed = !task.completed;

  persistAndRender(
    task.completed ? "Great work! Task completed." : "Task marked pending."
  );
}

function editTask(id) {
  const task = tasks.find(item => item.id === id);
  if (task) openTaskModal(task);
}

function deleteTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  const confirmed = confirm(`Delete "${task.title}"?`);

  if (!confirmed) return;

  tasks = tasks.filter(item => item.id !== id);
  persistAndRender("Task deleted.");
}

function taskRowHTML(task) {
  const title = escapeHTML(task.title);
  const subject = escapeHTML(task.subject || "Other");
  const priority = ["High", "Medium", "Low"].includes(task.priority)
    ? task.priority
    : "Medium";

  const dueLabel = task.dueDate
    ? formatDate(task.dueDate)
    : "No due date";

  const safeId = escapeHTML(task.id);

  return `
    <div class="task-row">
      <button
        class="task-check ${task.completed ? "checked" : ""}"
        data-action="toggle"
        data-id="${safeId}"
        aria-label="${task.completed ? "Mark pending" : "Complete task"}: ${title}"
        aria-pressed="${task.completed}"
        title="${task.completed ? "Mark pending" : "Complete task"}"
      >${task.completed ? "✓" : ""}</button>

      <div class="task-info">
        <p class="task-title ${task.completed ? "done" : ""}">${title}</p>

        <div class="task-meta">
          <span class="subject-tag">${subject}</span>
          <span class="priority-tag priority-${priority.toLowerCase()}">${priority}</span>
          <span>${escapeHTML(dueLabel)}</span>
          ${isOverdue(task) ? '<span class="status-tag">Overdue</span>' : ""}
        </div>
      </div>

      <div class="task-actions">
        <button
          class="task-action"
          data-action="edit"
          data-id="${safeId}"
          aria-label="Edit ${title}"
          title="Edit task"
        >✎</button>

        <button
          class="task-action delete"
          data-action="delete"
          data-id="${safeId}"
          aria-label="Delete ${title}"
          title="Delete task"
        >×</button>
      </div>
    </div>
  `;
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === "toggle") toggleTask(id);
  if (action === "edit") editTask(id);
  if (action === "delete") deleteTask(id);
});

// ------------------------------------------
// DASHBOARD
// ------------------------------------------

function renderDashboard() {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  const pending = total - completed;
  const percentage = total ? Math.round((completed / total) * 100) : 0;

  $("#totalTasks").textContent = total;
  $("#completedTasks").textContent = completed;
  $("#pendingTasks").textContent = pending;
  $("#completionRate").textContent = `${percentage}%`;

  $("#taskNavCount").textContent = pending;

  $("#ringPercent").textContent = `${percentage}%`;
  $("#progressRing").style.background = `
    conic-gradient(
      var(--purple) ${percentage * 3.6}deg,
      #f0edf8 ${percentage * 3.6}deg
    )
  `;

  $("#legendDone").textContent = completed;
  $("#legendPending").textContent = pending;

  if (total === 0) {
    $("#progressMessage").textContent =
      "Your journey starts with one task.";
  } else if (percentage === 100) {
    $("#progressMessage").textContent =
      "Amazing! You've completed every task.";
  } else if (percentage >= 60) {
    $("#progressMessage").textContent =
      "You're making great progress. Keep going!";
  } else {
    $("#progressMessage").textContent =
      "One task at a time. You've got this!";
  }

  const today = getLocalDateString();

  const todayTasks = tasks
    .filter(task => !task.completed && task.dueDate === today);

  const otherTasks = tasks
    .filter(task => !task.completed && task.dueDate !== today)
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

  const completedTasks = tasks.filter(task => task.completed);

  const displayTasks = [
    ...todayTasks,
    ...otherTasks,
    ...completedTasks
  ].slice(0, 5);

  $("#dashboardTaskList").innerHTML =
    displayTasks.map(taskRowHTML).join("");

  $("#dashboardEmpty").classList.toggle("hidden", total > 0);
  $("#dashboardTaskList").classList.toggle("hidden", total === 0);
}

// ------------------------------------------
// TASK SEARCH AND FILTERS
// ------------------------------------------

function renderTaskManager() {
  const search = $("#taskSearch").value.trim().toLowerCase();
  const status = $("#statusFilter").value;
  const subject = $("#subjectFilter").value;

  const filtered = tasks.filter(task => {
    const matchesSearch =
      task.title.toLowerCase().includes(search) ||
      (task.notes || "").toLowerCase().includes(search);

    const matchesStatus =
      status === "all" ||
      (status === "completed" && task.completed) ||
      (status === "pending" && !task.completed);

    const matchesSubject =
      subject === "all" || task.subject === subject;

    return matchesSearch && matchesStatus && matchesSubject;
  });

  $("#fullTaskList").innerHTML = filtered.map(taskRowHTML).join("");
  $("#tasksEmpty").classList.toggle("hidden", filtered.length > 0);
}

$("#taskSearch").addEventListener("input", renderTaskManager);
$("#statusFilter").addEventListener("change", renderTaskManager);
$("#subjectFilter").addEventListener("change", renderTaskManager);

// ------------------------------------------
// STUDY PLANNER
// ------------------------------------------

function renderPlanner() {
  const upcoming = tasks
    .filter(task => task.dueDate && !task.completed)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  $("#plannerList").innerHTML = upcoming.map(task => {
    const date = new Date(`${task.dueDate}T12:00:00`);
    const day = date.getDate();
    const month = date.toLocaleDateString("en", { month: "short" });

    let dueText = formatDate(task.dueDate);

    if (isOverdue(task)) {
      dueText = "Overdue";
    } else if (task.dueDate === getLocalDateString()) {
      dueText = "Due today";
    }

    return `
      <div class="planner-row">
        <div class="date-tile">
          <span>${escapeHTML(month)}</span>
          <strong>${day}</strong>
        </div>

        <div class="planner-info">
          <strong>${escapeHTML(task.title)}</strong>
          <p>${escapeHTML(task.subject || "Other")} ·
            ${escapeHTML(task.priority || "Medium")} priority</p>
        </div>

        <span class="due-label ${isOverdue(task) ? "overdue" : ""}">
          ${escapeHTML(dueText)}
        </span>

        <button
          class="task-action"
          data-action="edit"
          data-id="${escapeHTML(task.id)}"
          aria-label="Edit ${escapeHTML(task.title)}"
          title="Edit task"
        >✎</button>
      </div>
    `;
  }).join("");

  $("#plannerEmpty").classList.toggle("hidden", upcoming.length > 0);
}

// ------------------------------------------
// FOCUS TIMER
// ------------------------------------------

const timerDisplay = $("#timerDisplay");
const timerStart = $("#timerStart");
const focusModeLabel = $("#focusModeLabel");
const focusHint = $("#focusHint");

let selectedMinutes = 25;
let remainingSeconds = selectedMinutes * 60;
let timerInterval = null;
let timerRunning = false;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function updateTimerDisplay() {
  timerDisplay.textContent = formatTime(remainingSeconds);
  document.title = timerRunning
    ? `${formatTime(remainingSeconds)} — StudyFlow`
    : "StudyFlow — Your Study Space";
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
  timerStart.textContent = "▶ Start focus";
}

function finishTimer() {
  stopTimer();
  remainingSeconds = 0;
  updateTimerDisplay();

  focusModeLabel.textContent = "Session complete!";
  focusHint.textContent = "Take a short break and celebrate your progress.";
  showToast("Focus session complete. Well done!");

  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification("StudyFlow", {
        body: "Your focus session is complete. Time for a break!"
      });
    } catch (error) {
      console.log("Desktop notification unavailable.");
    }
  }
}

function startTimer() {
  if (timerRunning) {
    stopTimer();
    focusHint.textContent = "Paused. Resume whenever you're ready.";
    updateTimerDisplay();
    return;
  }

  if (remainingSeconds <= 0) {
    remainingSeconds = selectedMinutes * 60;
  }

  timerRunning = true;
  timerStart.textContent = "Ⅱ Pause";
  focusModeLabel.textContent = "You're in focus mode";
  focusHint.textContent = "One thing at a time. Stay with it.";

  updateTimerDisplay();

  timerInterval = setInterval(() => {
    if (remainingSeconds > 0) {
      remainingSeconds--;
      updateTimerDisplay();
    }

    if (remainingSeconds <= 0) {
      finishTimer();
    }
  }, 1000);
}

timerStart.addEventListener("click", startTimer);

$("#timerReset").addEventListener("click", () => {
  stopTimer();
  remainingSeconds = selectedMinutes * 60;

  focusModeLabel.textContent = "Time to focus";
  focusHint.textContent = "Choose a session length that works for you.";

  updateTimerDisplay();
  showToast("Timer reset.");
});

$$(".timer-preset").forEach(button => {
  button.addEventListener("click", () => {
    stopTimer();

    selectedMinutes = Number(button.dataset.minutes);
    remainingSeconds = selectedMinutes * 60;

    $$(".timer-preset").forEach(preset => {
      preset.classList.toggle("active", preset === button);
    });

    focusModeLabel.textContent = "Time to focus";
    focusHint.textContent = "Choose a session length that works for you.";

    updateTimerDisplay();
  });
});

// ------------------------------------------
// RESET ALL TASKS
// ------------------------------------------

$("#resetBtn").addEventListener("click", () => {
  if (tasks.length === 0) {
    showToast("There are no saved tasks to reset.");
    return;
  }

  const confirmed = confirm(
    "Delete ALL StudyFlow tasks? This cannot be undone."
  );

  if (!confirmed) return;

  const previousTasks = tasks;
  tasks = [];

  if (!saveTasks()) {
    tasks = previousTasks;
    return;
  }

  renderAll();
  showToast("All tasks have been cleared.");
});

// ------------------------------------------
// RENDER EVERYTHING
// ------------------------------------------

function renderAll() {
  renderDashboard();
  renderTaskManager();
  renderPlanner();
}

function initializeStudyFlow() {
  $("#headerDate").textContent = new Date().toLocaleDateString("en", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).toUpperCase();

  renderAll();
  updateTimerDisplay();

  const requestedView = location.hash.slice(1);
  navigateTo(viewNames[requestedView] ? requestedView : "dashboard");
}

initializeStudyFlow();
