/**
 * App: Логика взаимодействия с интерфейсом (DOM, события, темы, доступность)
 */

document.addEventListener('DOMContentLoaded', () => {
  const store = new TaskStore('antigravity_todo_tasks');

  // DOM-элементы
  const todoForm = document.getElementById('todo-form');
  const taskInput = document.getElementById('task-input');
  const categorySelect = document.getElementById('category-select');
  const formError = document.getElementById('form-error');

  const tasksList = document.getElementById('tasks-list');
  const emptyState = document.getElementById('empty-state');
  const itemsLeft = document.getElementById('items-left');
  const clearCompletedBtn = document.getElementById('clear-completed-btn');

  const searchInput = document.getElementById('search-input');
  const filterTabs = document.querySelectorAll('.filter-tab');

  const themeToggle = document.getElementById('theme-toggle');
  const toast = document.getElementById('toast');
  const a11yStatus = document.getElementById('a11y-status');

  // Элементы статистики
  const percentLabel = document.getElementById('percent-label');
  const progressFill = document.getElementById('progress-fill');
  const progressBar = document.getElementById('progress-bar');
  const motivationText = document.getElementById('motivation-text');
  const countTotal = document.getElementById('count-total');
  const countActiveStat = document.getElementById('count-active-stat');
  const countCompletedStat = document.getElementById('count-completed-stat');

  // Бейджи в табах
  const badgeAll = document.getElementById('badge-all');
  const badgeActive = document.getElementById('badge-active');
  const badgeCompleted = document.getElementById('badge-completed');

  // Локальное состояние UI
  let currentFilter = 'all';
  let currentSearch = '';
  let toastTimeout = null;

  // Имена категорий на русском
  const CATEGORY_NAMES = {
    work: 'Работа',
    personal: 'Личное',
    study: 'Учеба',
    urgent: 'Срочно',
    general: 'Общее',
  };

  /* ==========================================================================
     Инициализация темы оформления
     ========================================================================== */
  function initTheme() {
    const savedTheme = localStorage.getItem('antigravity_todo_theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('antigravity_todo_theme', newTheme);
    announceA11y(`Включена ${newTheme === 'dark' ? 'темная' : 'светлая'} тема`);
  }

  /* ==========================================================================
     Уведомления и доступность (a11y)
     ========================================================================== */
  function showToast(message) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  function announceA11y(text) {
    if (a11yStatus) {
      a11yStatus.textContent = '';
      setTimeout(() => {
        a11yStatus.textContent = text;
      }, 50);
    }
  }

  /* ==========================================================================
     Форматирование даты и времени
     ========================================================================== */
  function formatRelativeTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);

    if (diffSec < 60) return 'только что';
    if (diffMin < 60) return `${diffMin} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;

    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }

  /* ==========================================================================
     Обновление статистики и прогресс-бара
     ========================================================================== */
  function updateStats() {
    const stats = store.getStats();

    percentLabel.textContent = `${stats.percent}%`;
    progressFill.style.width = `${stats.percent}%`;
    progressBar.setAttribute('aria-valuenow', stats.percent);

    countTotal.textContent = stats.total;
    countActiveStat.textContent = stats.active;
    countCompletedStat.textContent = stats.completed;

    badgeAll.textContent = stats.total;
    badgeActive.textContent = stats.active;
    badgeCompleted.textContent = stats.completed;

    // Склонение слова "задача"
    const remainingText = formatRemainingText(stats.active);
    itemsLeft.textContent = remainingText;

    // Мотивационный текст
    if (stats.total === 0) {
      motivationText.textContent = 'Список пуст — добавьте первую задачу!';
    } else if (stats.percent === 100) {
      motivationText.textContent = 'Превосходно! Все задачи выполнены 🎉';
    } else if (stats.percent >= 50) {
      motivationText.textContent = 'Отличный темп, больше половины сделано! 💪';
    } else {
      motivationText.textContent = 'Продуктивного дня, шаг за шагом! 🚀';
    }

    // Состояние кнопки очистки завершенных
    clearCompletedBtn.style.visibility = stats.completed > 0 ? 'visible' : 'hidden';
  }

  function formatRemainingText(count) {
    if (count % 10 === 1 && count % 100 !== 11) {
      return `Осталась ${count} активная задача`;
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
      return `Осталось ${count} активные задачи`;
    } else {
      return `Осталось ${count} активных задач`;
    }
  }

  /* ==========================================================================
     Рендеринг списка задач
     ========================================================================== */
  function render(animId = null) {
    const tasks = store.getFilteredTasks({
      filter: currentFilter,
      searchQuery: currentSearch,
    });

    tasksList.innerHTML = '';

    if (tasks.length === 0) {
      emptyState.classList.remove('hidden');
      if (currentSearch) {
        emptyState.querySelector('.empty-title').textContent = 'Ничего не найдено';
        emptyState.querySelector('.empty-text').textContent = 'Попробуйте изменить поисковый запрос';
      } else if (currentFilter === 'completed') {
        emptyState.querySelector('.empty-title').textContent = 'Нет завершенных задач';
        emptyState.querySelector('.empty-text').textContent = 'Отмечайте выполненные задачи галочкой';
      } else if (currentFilter === 'active') {
        emptyState.querySelector('.empty-title').textContent = 'Все задачи завершены!';
        emptyState.querySelector('.empty-text').textContent = 'Отличная работа, можно отдохнуть или добавить новые';
      } else {
        emptyState.querySelector('.empty-title').textContent = 'Задач пока нет';
        emptyState.querySelector('.empty-text').textContent = 'Добавьте свою первую задачу с помощью формы выше!';
      }
    } else {
      emptyState.classList.add('hidden');

      tasks.forEach((task) => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id;

        if (task.id === animId) {
          li.classList.add('slide-in');
        }

        const catName = CATEGORY_NAMES[task.category] || CATEGORY_NAMES.general;
        const formattedDate = formatRelativeTime(task.createdAt);

        li.innerHTML = `
          <label class="checkbox-container" aria-label="Отметить задачу как ${task.completed ? 'невыполненную' : 'выполненную'}">
            <input type="checkbox" class="checkbox-native" ${task.completed ? 'checked' : ''}>
            <span class="checkbox-custom" aria-hidden="true">
              <svg class="checkbox-icon" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
          </label>

          <div class="task-content">
            <span class="task-title" title="Двойной клик для редактирования">${escapeHTML(task.text)}</span>
            <div class="task-meta">
              <span class="badge badge-${task.category}">${catName}</span>
              <time datetime="${task.createdAt}">${formattedDate}</time>
            </div>
          </div>

          <div class="task-actions">
            <button type="button" class="action-btn edit-btn" title="Редактировать задачу" aria-label="Редактировать">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button type="button" class="action-btn delete-btn" title="Удалить задачу" aria-label="Удалить">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        `;

        tasksList.appendChild(li);
      });
    }

    updateStats();
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ==========================================================================
     Обработчики событий добавления задачи
     ========================================================================== */
  todoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();

    if (!text) {
      formError.textContent = 'Пожалуйста, введите текст задачи';
      taskInput.focus();
      return;
    }

    formError.textContent = '';
    const category = categorySelect.value;

    try {
      const newTask = store.addTask({ text, category });
      taskInput.value = '';
      taskInput.focus();

      render(newTask.id);
      showToast('Задача успешно добавлена!');
      announceA11y(`Добавлена новая задача: ${text}`);
    } catch (err) {
      formError.textContent = err.message || 'Ошибка добавления задачи';
    }
  });

  taskInput.addEventListener('input', () => {
    if (formError.textContent) {
      formError.textContent = '';
    }
  });

  /* ==========================================================================
     Обработчики действий над задачами (делегирование событий)
     ========================================================================== */
  tasksList.addEventListener('click', (e) => {
    const item = e.target.closest('.task-item');
    if (!item) return;
    const id = item.dataset.id;

    // Переключение чекбокса
    if (e.target.closest('.checkbox-container')) {
      const updated = store.toggleTask(id);
      if (updated) {
        item.classList.toggle('completed', updated.completed);
        const checkbox = item.querySelector('.checkbox-native');
        if (checkbox) checkbox.checked = updated.completed;
        updateStats();

        const statusMsg = updated.completed ? 'отмечена как выполненная' : 'возвращена в активные';
        showToast(`Задача ${statusMsg}`);
        announceA11y(`Задача "${updated.text}" ${statusMsg}`);
      }
      return;
    }

    // Удаление задачи
    if (e.target.closest('.delete-btn')) {
      item.classList.add('fade-out');
      setTimeout(() => {
        const deleted = store.deleteTask(id);
        if (deleted) {
          render();
          showToast('Задача удалена');
          announceA11y('Задача удалена');
        }
      }, 200);
      return;
    }

    // Редактирование задачи (кнопка редактирования)
    if (e.target.closest('.edit-btn')) {
      startInlineEdit(item, id);
      return;
    }
  });

  // Редактирование по двойному клику на заголовок
  tasksList.addEventListener('dblclick', (e) => {
    const titleEl = e.target.closest('.task-title');
    if (!titleEl) return;
    const item = titleEl.closest('.task-item');
    if (item) {
      startInlineEdit(item, item.dataset.id);
    }
  });

  /* ==========================================================================
     Редактирование задачи по месту (Inline edit)
     ========================================================================== */
  function startInlineEdit(item, id) {
    if (item.classList.contains('editing')) return;
    item.classList.add('editing');

    const contentEl = item.querySelector('.task-content');
    const actionsEl = item.querySelector('.task-actions');
    const task = store.getAll().find((t) => t.id === id);
    if (!task) return;

    const originalText = task.text;
    contentEl.style.display = 'none';
    if (actionsEl) actionsEl.style.display = 'none';

    const editForm = document.createElement('form');
    editForm.className = 'inline-edit-form';
    editForm.innerHTML = `
      <input type="text" class="inline-edit-input" value="${escapeHTML(originalText)}" maxlength="200" required>
      <button type="submit" class="inline-edit-btn inline-save-btn">Сохранить</button>
      <button type="button" class="inline-edit-btn inline-cancel-btn">Отмена</button>
    `;

    item.appendChild(editForm);
    const input = editForm.querySelector('.inline-edit-input');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    function finishEdit(save) {
      if (save) {
        const newText = input.value.trim();
        if (newText && newText !== originalText) {
          store.editTask(id, newText);
          showToast('Задача обновлена');
          announceA11y(`Текст задачи изменен на: ${newText}`);
        }
      }
      render();
    }

    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      finishEdit(true);
    });

    editForm.querySelector('.inline-cancel-btn').addEventListener('click', () => {
      finishEdit(false);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        finishEdit(false);
      }
    });
  }

  /* ==========================================================================
     Фильтры и Поиск
     ========================================================================== */
  filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      filterTabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      currentFilter = tab.dataset.filter;

      render();
      announceA11y(`Показан список: ${tab.textContent.trim()}`);
    });
  });

  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value;
    render();
  });

  /* ==========================================================================
     Очистка завершенных задач
     ========================================================================== */
  clearCompletedBtn.addEventListener('click', () => {
    const stats = store.getStats();
    if (stats.completed === 0) return;

    const count = store.clearCompleted();
    render();
    showToast(`Удалено завершенных задач: ${count}`);
    announceA11y(`Удалено завершенных задач: ${count}`);
  });

  /* ==========================================================================
     Переключение темы и инициализация
     ========================================================================== */
  themeToggle.addEventListener('click', toggleTheme);

  initTheme();
  render();
});
