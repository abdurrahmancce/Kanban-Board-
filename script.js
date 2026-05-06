/**
 * KanbanFlow — script.js
 * Vanilla JS Kanban Board with Drag & Drop + localStorage persistence
 *
 * Architecture:
 *  - State: Single source of truth in `state.tasks` (array of task objects)
 *  - Render: Full re-render on each state mutation (simple, predictable)
 *  - Persistence: state auto-saves to localStorage on every mutation
 *  - DnD: HTML5 Drag & Drop API — dragstart/dragover/drop lifecycle
 */

'use strict';

/* ── Constants ──────────────────────────────────────────── */
const STORAGE_KEY   = 'kanbanflow_tasks_v1';
const COLUMNS       = ['todo', 'inprogress', 'done'];
const COLUMN_LABELS = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' };

/* ── State ──────────────────────────────────────────────── */
/** @type {{ id:string, title:string, column:string, createdAt:number }[]} */
let state = {
  tasks: [],
};

/** Tracks which card is being dragged */
let dragState = {
  cardId:       null,   // id of the card being dragged
  originColumn: null,   // column it started from
  placeholder:  null,   // DOM element for drop preview
};

/** Modal context: are we adding or editing? */
let modalContext = {
  mode:     'add',       // 'add' | 'edit'
  column:   null,        // target column for add
  taskId:   null,        // task id for edit
};

/* ── DOM References ─────────────────────────────────────── */
const modal        = document.getElementById('modal');
const modalInput   = document.getElementById('modal-input');
const modalTitle   = document.getElementById('modal-title');
const modalSave    = document.getElementById('modal-save');
const modalCancel  = document.getElementById('modal-cancel');
const charCount    = document.getElementById('char-count');
const toast        = document.getElementById('toast');

/* ── Initialisation ─────────────────────────────────────── */
function init() {
  loadState();
  render();
  bindStaticEvents();
}

/* ── Persistence ────────────────────────────────────────── */

/** Load tasks from localStorage into state */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        state.tasks = parsed;
        return;
      }
    }
  } catch (_) {
    // corrupted data — start fresh
  }
  state.tasks = getDefaultTasks();
}

/** Persist current state to localStorage */
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

/** Seed some sample tasks for first-time visitors */
function getDefaultTasks() {
  const now = Date.now();
  const s   = 1000 * 60; // 1 minute step between timestamps

  return [
    // ── To Do (10) ──────────────────────────────────────────
    { id: uid(), title: '👋 Welcome to KanbanFlow! Drag me around.',           column: 'todo',       createdAt: now - 60 * s },
    { id: uid(), title: '📋 Design the user onboarding flow wireframes.',      column: 'todo',       createdAt: now - 55 * s },
    { id: uid(), title: '🔍 Research competitor pricing strategies.',           column: 'todo',       createdAt: now - 50 * s },
    { id: uid(), title: '📧 Draft the Q3 newsletter campaign copy.',            column: 'todo',       createdAt: now - 45 * s },
    { id: uid(), title: '🛠 Set up CI/CD pipeline for the staging environment.',column: 'todo',       createdAt: now - 40 * s },
    { id: uid(), title: '📊 Create monthly analytics dashboard report.',        column: 'todo',       createdAt: now - 35 * s },
    { id: uid(), title: '🧪 Write unit tests for the payment module.',          column: 'todo',       createdAt: now - 30 * s },
    { id: uid(), title: '🎨 Update brand color palette across all assets.',     column: 'todo',       createdAt: now - 25 * s },
    { id: uid(), title: '📱 Audit mobile responsiveness on all product pages.', column: 'todo',       createdAt: now - 20 * s },
    { id: uid(), title: '🗂 Organize the shared Figma component library.',      column: 'todo',       createdAt: now - 15 * s },

    // ── In Progress (10) ────────────────────────────────────
    { id: uid(), title: '⚙️ Refactoring the legacy authentication service.',    column: 'inprogress', createdAt: now - 58 * s },
    { id: uid(), title: '🖥 Building the new admin dashboard UI.',               column: 'inprogress', createdAt: now - 53 * s },
    { id: uid(), title: '🔗 Integrating Stripe API for subscription billing.',  column: 'inprogress', createdAt: now - 48 * s },
    { id: uid(), title: '📝 Writing API documentation for v2 endpoints.',       column: 'inprogress', createdAt: now - 43 * s },
    { id: uid(), title: '🐛 Debugging the cart total rounding error.',          column: 'inprogress', createdAt: now - 38 * s },
    { id: uid(), title: '🌐 Localising the app for French and German markets.', column: 'inprogress', createdAt: now - 33 * s },
    { id: uid(), title: '📦 Migrating the database from MySQL to PostgreSQL.',  column: 'inprogress', createdAt: now - 28 * s },
    { id: uid(), title: '🔔 Implementing push notifications for mobile app.',   column: 'inprogress', createdAt: now - 23 * s },
    { id: uid(), title: '🤝 Onboarding two new engineers to the codebase.',     column: 'inprogress', createdAt: now - 18 * s },
    { id: uid(), title: '🎯 A/B testing the new landing page hero copy.',       column: 'inprogress', createdAt: now - 13 * s },

    // ── Done (10) ───────────────────────────────────────────
    { id: uid(), title: '✅ Project setup & initial scaffolding complete.',     column: 'done',       createdAt: now - 56 * s },
    { id: uid(), title: '✅ Finalised tech stack and architecture decisions.',  column: 'done',       createdAt: now - 51 * s },
    { id: uid(), title: '✅ Designed and approved logo & visual identity.',     column: 'done',       createdAt: now - 46 * s },
    { id: uid(), title: '✅ Shipped dark mode support across the platform.',    column: 'done',       createdAt: now - 41 * s },
    { id: uid(), title: '✅ Completed accessibility audit (WCAG 2.1 AA).',      column: 'done',       createdAt: now - 36 * s },
    { id: uid(), title: '✅ Deployed v1.0 to production — zero downtime! 🚀',  column: 'done',       createdAt: now - 31 * s },
    { id: uid(), title: '✅ Set up error monitoring with Sentry integration.',  column: 'done',       createdAt: now - 26 * s },
    { id: uid(), title: '✅ Conducted and documented user research interviews.',column: 'done',       createdAt: now - 21 * s },
    { id: uid(), title: '✅ Resolved all critical security vulnerabilities.',   column: 'done',       createdAt: now - 16 * s },
    { id: uid(), title: '✅ Sprint retrospective held — team velocity up 20%!', column: 'done',       createdAt: now - 11 * s },
  ];
}

/* ── Render ─────────────────────────────────────────────── */

/**
 * Full re-render: clear all task lists and repopulate.
 * Keeps it simple and avoids DOM diffing complexity.
 */
function render() {
  COLUMNS.forEach(col => {
    const list  = document.getElementById(`list-${col}`);
    const count = document.getElementById(`count-${col}`);

    // Clear existing cards
    list.innerHTML = '';

    // Filter tasks for this column
    const tasks = state.tasks.filter(t => t.column === col);

    // Update column count badge
    count.textContent = tasks.length;

    // Render each card
    tasks.forEach(task => {
      list.appendChild(createCardElement(task));
    });

    // Re-attach drag-and-drop listeners to the list
    attachListDnDListeners(list);
  });
}

/** Build and return a card DOM element for a task */
function createCardElement(task) {
  const card = document.createElement('div');
  card.className    = 'task-card';
  card.draggable    = true;
  card.dataset.id   = task.id;
  card.setAttribute('role', 'listitem');
  card.setAttribute('aria-label', `Task: ${task.title}`);

  // Short ID for display (last 5 chars of uid)
  const shortId = task.id.slice(-5).toUpperCase();

  card.innerHTML = `
    <div class="card-body">
      <p class="card-title">${escapeHTML(task.title)}</p>
      <div class="card-actions" role="group" aria-label="Card actions">
        <button
          class="card-btn edit-btn"
          data-id="${task.id}"
          aria-label="Edit task"
          title="Edit"
        >
          <!-- Pencil icon -->
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M11.5 1.5a2.121 2.121 0 0 1 3 3L5 14H1v-4L11.5 1.5z"
                  stroke="currentColor" stroke-width="1.6"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button
          class="card-btn delete-btn"
          data-id="${task.id}"
          aria-label="Delete task"
          title="Delete"
        >
          <!-- Trash icon -->
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9"
                  stroke="currentColor" stroke-width="1.6"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="card-footer">
      <span class="card-id-badge">#${shortId}</span>
      <span class="card-timestamp">${formatDate(task.createdAt)}</span>
    </div>
  `;

  // Card-level drag events
  card.addEventListener('dragstart', onCardDragStart);
  card.addEventListener('dragend',   onCardDragEnd);

  // Edit button
  card.querySelector('.edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openModal('edit', null, task.id);
  });

  // Delete button
  card.querySelector('.delete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteTask(task.id);
  });

  return card;
}

/* ── Task CRUD ──────────────────────────────────────────── */

/**
 * Add a new task to a column
 * @param {string} column - 'todo' | 'inprogress' | 'done'
 * @param {string} title  - task content
 */
function addTask(column, title) {
  const task = {
    id:        uid(),
    title:     title.trim(),
    column,
    createdAt: Date.now(),
  };
  state.tasks.push(task);
  saveState();
  render();
  showToast(`Task added to "${COLUMN_LABELS[column]}"`);
}

/**
 * Update task title
 * @param {string} id       - task id
 * @param {string} newTitle - updated title text
 */
function updateTask(id, newTitle) {
  const task = findTask(id);
  if (!task) return;
  task.title = newTitle.trim();
  saveState();
  render();
  showToast('Task updated');
}

/**
 * Delete a task by id
 * @param {string} id
 */
function deleteTask(id) {
  const idx = state.tasks.findIndex(t => t.id === id);
  if (idx === -1) return;
  state.tasks.splice(idx, 1);
  saveState();
  render();
  showToast('Task deleted');
}

/**
 * Move a task to a different column
 * @param {string} id         - task id
 * @param {string} newColumn  - target column
 */
function moveTask(id, newColumn) {
  const task = findTask(id);
  if (!task || task.column === newColumn) return;
  task.column = newColumn;
  saveState();
  render();
}

/** Find a task by id */
function findTask(id) {
  return state.tasks.find(t => t.id === id) || null;
}

/* ── Modal ──────────────────────────────────────────────── */

/**
 * Open the add/edit modal
 * @param {'add'|'edit'} mode
 * @param {string|null}  column - required for 'add' mode
 * @param {string|null}  taskId - required for 'edit' mode
 */
function openModal(mode, column, taskId) {
  modalContext = { mode, column, taskId };

  if (mode === 'edit') {
    const task = findTask(taskId);
    if (!task) return;
    modalTitle.textContent  = 'Edit Task';
    modalSave.textContent   = 'Save Changes';
    modalInput.value        = task.title;
  } else {
    modalTitle.textContent  = 'New Task';
    modalSave.textContent   = 'Save Task';
    modalInput.value        = '';
  }

  updateCharCount();
  modal.classList.add('open');

  // Auto-focus textarea after transition
  setTimeout(() => modalInput.focus(), 60);
}

function closeModal() {
  modal.classList.remove('open');
  modalInput.value = '';
  updateCharCount();
}

function updateCharCount() {
  charCount.textContent = modalInput.value.length;
}

/* ── Drag & Drop ────────────────────────────────────────── */
/*
 * Implementation using the HTML5 Drag and Drop API:
 *
 * 1. DRAGSTART (on card):
 *    - Record the dragged card's ID and origin column in dragState
 *    - Add `.dragging` class for visual feedback (faded + rotated)
 *    - Create a placeholder element to show the drop preview
 *
 * 2. DRAGOVER (on task-list):
 *    - Called continuously while hovering over a valid drop zone
 *    - `event.preventDefault()` is REQUIRED to allow dropping
 *    - Add `.drag-over` class to the column for highlight
 *    - Calculate where to insert the placeholder: compare drag Y
 *      to midpoints of existing cards, then insertBefore/append
 *
 * 3. DRAGLEAVE (on task-list / column):
 *    - Remove `.drag-over` and placeholder when leaving the zone
 *
 * 4. DROP (on task-list):
 *    - Move the task in state to the new column
 *    - Re-render all columns
 *
 * 5. DRAGEND (on card):
 *    - Cleanup: remove `.dragging`, `.drag-over`, placeholder
 *    - Acts as a safety net for missed drop events
 */

/** Attach drag-over / dragleave / drop listeners to a task list element */
function attachListDnDListeners(listEl) {
  listEl.addEventListener('dragover',  onListDragOver);
  listEl.addEventListener('dragleave', onListDragLeave);
  listEl.addEventListener('drop',      onListDrop);
}

/* — Card drag start — */
function onCardDragStart(e) {
  const card = e.currentTarget;

  dragState.cardId       = card.dataset.id;
  dragState.originColumn = card.closest('.task-list').dataset.column;

  // Create and style the placeholder
  const ph = document.createElement('div');
  ph.className    = 'drag-placeholder';
  ph.style.height = card.offsetHeight + 'px';
  ph.style.display = 'block';
  dragState.placeholder = ph;

  // Set drag image to a transparent ghost (card handles its own visual)
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragState.cardId); // required in some browsers

  // Small delay so the card is visible before it fades
  requestAnimationFrame(() => {
    card.classList.add('dragging');
  });
}

/* — Card drag end (cleanup safety net) — */
function onCardDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  cleanupDrag();
}

/* — List drag over: show placeholder at correct position — */
function onListDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const list = e.currentTarget;
  const col  = list.closest('.column');
  col.classList.add('drag-over');

  // Get all cards in this list (excluding the placeholder itself)
  const cards = [...list.querySelectorAll('.task-card:not(.dragging)')];

  // Find insertion point by comparing drag Y to card midpoints
  let insertBefore = null;
  for (const card of cards) {
    const rect   = card.getBoundingClientRect();
    const midY   = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      insertBefore = card;
      break;
    }
  }

  // Place the placeholder
  const ph = dragState.placeholder;
  if (!ph) return;

  if (insertBefore) {
    list.insertBefore(ph, insertBefore);
  } else {
    list.appendChild(ph);
  }
}

/* — List drag leave: remove highlight if leaving the column area — */
function onListDragLeave(e) {
  const list = e.currentTarget;
  const col  = list.closest('.column');

  // Only remove if we actually left the column (not just a child element)
  if (!col.contains(e.relatedTarget)) {
    col.classList.remove('drag-over');
    const ph = dragState.placeholder;
    if (ph && ph.parentNode === list) {
      list.removeChild(ph);
    }
  }
}

/* — List drop: commit the move — */
function onListDrop(e) {
  e.preventDefault();

  const list      = e.currentTarget;
  const newColumn = list.dataset.column;

  if (dragState.cardId && newColumn) {
    moveTask(dragState.cardId, newColumn);
  }

  cleanupDrag();
}

/** Remove all drag-related visual artefacts */
function cleanupDrag() {
  // Remove drag-over highlights
  document.querySelectorAll('.column.drag-over').forEach(col => {
    col.classList.remove('drag-over');
  });

  // Remove placeholder from DOM
  if (dragState.placeholder && dragState.placeholder.parentNode) {
    dragState.placeholder.parentNode.removeChild(dragState.placeholder);
  }

  // Reset drag state
  dragState = { cardId: null, originColumn: null, placeholder: null };
}

/* ── Static Event Bindings ──────────────────────────────── */

function bindStaticEvents() {

  /* "Add" buttons on each column header */
  document.querySelectorAll('.add-task-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openModal('add', btn.dataset.column, null);
    });
  });

  /* Modal save */
  modalSave.addEventListener('click', handleModalSave);

  /* Modal cancel */
  modalCancel.addEventListener('click', closeModal);

  /* Click outside modal to close */
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  /* Keyboard: Enter to save (Shift+Enter = newline), Escape to close */
  modalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleModalSave();
    }
    if (e.key === 'Escape') closeModal();
  });

  /* Live character count */
  modalInput.addEventListener('input', updateCharCount);
}

/* ── Modal Save Handler ─────────────────────────────────── */
function handleModalSave() {
  const value = modalInput.value.trim();

  if (!value) {
    // Shake the textarea to indicate empty input
    modalInput.style.animation = 'none';
    requestAnimationFrame(() => {
      modalInput.style.animation = 'shake .35s var(--ease)';
    });
    return;
  }

  if (modalContext.mode === 'add') {
    addTask(modalContext.column, value);
  } else {
    updateTask(modalContext.taskId, value);
  }

  closeModal();
}

/* ── Toast Notifications ────────────────────────────────── */
let toastTimer = null;

/**
 * Show a brief toast message
 * @param {string} message
 */
function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

/* ── Utilities ──────────────────────────────────────────── */

/**
 * Generate a unique ID (timestamp + random hex)
 * @returns {string}
 */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/**
 * Format a Unix timestamp to a short human-readable string
 * e.g. "Today 14:32" or "Apr 28"
 * @param {number} ts
 * @returns {string}
 */
function formatDate(ts) {
  const d   = new Date(ts);
  const now = new Date();

  const pad = n => String(n).padStart(2, '0');
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  // Same calendar day
  if (d.toDateString() === now.toDateString()) {
    return `Today ${time}`;
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${time}`;
  }

  // Older
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

/* ── Inject shake keyframe dynamically (for empty-input feedback) ── */
(function injectShakeKeyframe() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%       { transform: translateX(-6px); }
      40%       { transform: translateX(6px); }
      60%       { transform: translateX(-4px); }
      80%       { transform: translateX(4px); }
    }
  `;
  document.head.appendChild(style);
})();

/* ── Bootstrap ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);