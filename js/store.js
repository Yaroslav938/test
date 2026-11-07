/**
 * TaskStore: Управление состоянием задач, приоритетами, дедлайнами и персистенцией в LocalStorage
 */

const DEFAULT_TASKS = [
  {
    id: 'demo-1',
    text: 'Ознакомиться с возможностями TaskFlow',
    completed: true,
    category: 'work',
    priority: 'medium',
    dueDate: null,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'demo-2',
    text: 'Настроить тему оформления и акцентный цвет в настройках ⚙️',
    completed: false,
    category: 'personal',
    priority: 'high',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'demo-3',
    text: 'Установить приложение на телефон через меню браузера (PWA)',
    completed: false,
    category: 'study',
    priority: 'low',
    dueDate: null,
    createdAt: new Date().toISOString(),
  },
];

const PRIORITY_WEIGHTS = {
  high: 3,
  medium: 2,
  low: 1,
};

class TaskStore {
  /**
   * @param {string} storageKey Ключ хранения в LocalStorage
   * @param {Storage} [customStorage] Опциональное кастомное хранилище (для тестов)
   */
  constructor(storageKey = 'antigravity_todo_tasks', customStorage = null) {
    this.storageKey = storageKey;
    this.storage = customStorage || this._resolveStorage();
    this.tasks = this._load();
  }

  /**
   * Безопасное получение объекта Storage с защитой от SSR и отключенных cookie/storage
   */
  _resolveStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
    } catch (e) {
      console.warn('LocalStorage недоступен, используется хранилище в памяти:', e);
    }

    const memory = new Map();
    return {
      getItem: (key) => memory.get(key) || null,
      setItem: (key, val) => memory.set(key, String(val)),
      removeItem: (key) => memory.delete(key),
      clear: () => memory.clear(),
    };
  }

  /**
   * Загрузка списка задач
   */
  _load() {
    try {
      const data = this.storage.getItem(this.storageKey);
      if (!data) {
        return [...DEFAULT_TASKS];
      }
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Ошибка чтения из хранилища:', err);
      return [...DEFAULT_TASKS];
    }
  }

  /**
   * Сохранение задач в LocalStorage
   */
  _save() {
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.tasks));
      return true;
    } catch (err) {
      console.error('Ошибка записи в хранилище (возможно превышена квота):', err);
      return false;
    }
  }

  /**
   * Получить все задачи
   */
  getAll() {
    return [...this.tasks];
  }

  /**
   * Добавить новую задачу
   * @param {Object} payload
   * @param {string} payload.text
   * @param {string} [payload.category]
   * @param {'high'|'medium'|'low'} [payload.priority]
   * @param {string|null} [payload.dueDate] YYYY-MM-DD
   * @returns {Object} Созданная задача
   */
  addTask({ text, category = 'general', priority = 'medium', dueDate = null }) {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      throw new Error('Текст задачи не может быть пустым');
    }

    const newTask = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'task-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      text: trimmed,
      completed: false,
      category: category || 'general',
      priority: ['high', 'medium', 'low'].includes(priority) ? priority : 'medium',
      dueDate: dueDate || null,
      createdAt: new Date().toISOString(),
    };

    this.tasks.unshift(newTask);
    this._save();
    return newTask;
  }

  /**
   * Переключить статус выполнения задачи
   * @param {string} id
   * @returns {Object|null}
   */
  toggleTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return null;

    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
    this._save();
    return task;
  }

  /**
   * Редактировать текст и параметры задачи
   * @param {string} id
   * @param {Object|string} updates
   * @returns {Object|null}
   */
  editTask(id, updates) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return null;

    if (typeof updates === 'string') {
      const trimmed = updates.trim();
      if (!trimmed) throw new Error('Текст задачи не может быть пустым');
      task.text = trimmed;
    } else if (typeof updates === 'object' && updates !== null) {
      if (updates.text !== undefined) {
        const trimmed = updates.text.trim();
        if (!trimmed) throw new Error('Текст задачи не может быть пустым');
        task.text = trimmed;
      }
      if (updates.category) task.category = updates.category;
      if (updates.priority) task.priority = updates.priority;
      if (updates.dueDate !== undefined) task.dueDate = updates.dueDate;
    }

    task.updatedAt = new Date().toISOString();
    this._save();
    return task;
  }

  /**
   * Удалить задачу по идентификатору
   * @param {string} id
   * @returns {boolean}
   */
  deleteTask(id) {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) return false;

    this.tasks.splice(index, 1);
    this._save();
    return true;
  }

  /**
   * Удалить все выполненные задачи
   * @returns {number} Количество удаленных задач
   */
  clearCompleted() {
    const initialCount = this.tasks.length;
    this.tasks = this.tasks.filter((t) => !t.completed);
    this._save();
    return initialCount - this.tasks.length;
  }

  /**
   * Полная очистка всех задач
   */
  clearAll() {
    this.tasks = [];
    this._save();
  }

  /**
   * Получить агрегированную статистику
   */
  getStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter((t) => t.completed).length;
    const active = total - completed;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = this.tasks.filter(
      (t) => !t.completed && t.dueDate && t.dueDate < todayStr
    ).length;

    const highPriority = this.tasks.filter((t) => !t.completed && t.priority === 'high').length;

    return { total, completed, active, percent, overdue, highPriority };
  }

  /**
   * Фильтрация и сортировка задач
   * @param {Object} options
   * @param {'all'|'active'|'completed'} [options.filter='all']
   * @param {string} [options.searchQuery='']
   * @param {'date-desc'|'date-asc'|'priority-desc'|'due-date'|'alpha'} [options.sortBy='date-desc']
   * @param {string} [options.category='all']
   */
  getFilteredTasks({
    filter = 'all',
    searchQuery = '',
    sortBy = 'date-desc',
    category = 'all',
  } = {}) {
    let result = [...this.tasks];

    // Фильтр по статусу
    if (filter === 'active') {
      result = result.filter((t) => !t.completed);
    } else if (filter === 'completed') {
      result = result.filter((t) => t.completed);
    }

    // Фильтр по категории
    if (category && category !== 'all') {
      result = result.filter((t) => t.category === category);
    }

    // Поиск по тексту
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((t) => t.text.toLowerCase().includes(q));
    }

    // Сортировка
    result.sort((a, b) => {
      // Завершенные задачи всегда можно визуально группировать или сортировать в конце
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      switch (sortBy) {
        case 'priority-desc': {
          const wA = PRIORITY_WEIGHTS[a.priority] || 1;
          const wB = PRIORITY_WEIGHTS[b.priority] || 1;
          if (wA !== wB) return wB - wA;
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        case 'due-date': {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
        case 'alpha':
          return a.text.localeCompare(b.text, 'ru');
        case 'date-asc':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'date-desc':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    return result;
  }

  /**
   * Экспорт данных в формат JSON
   * @returns {string}
   */
  exportData() {
    const payload = {
      app: 'TaskFlow',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      tasks: this.tasks,
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Импорт данных из JSON строки
   * @param {string} jsonString
   * @param {boolean} [replace=false] Заменить текущие задачи или объединить
   * @returns {number} Количество импортированных задач
   */
  importData(jsonString, replace = false) {
    const parsed = JSON.parse(jsonString);
    const incomingTasks = Array.isArray(parsed)
      ? parsed
      : (parsed && Array.isArray(parsed.tasks) ? parsed.tasks : null);

    if (!incomingTasks) {
      throw new Error('Некорректный формат файла импорта');
    }

    const validated = incomingTasks
      .filter((t) => t && typeof t.text === 'string' && t.text.trim())
      .map((t) => ({
        id: t.id || 'imported-' + Math.random().toString(36).slice(2, 9),
        text: t.text.trim(),
        completed: Boolean(t.completed),
        category: t.category || 'general',
        priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
        dueDate: t.dueDate || null,
        createdAt: t.createdAt || new Date().toISOString(),
      }));

    if (replace) {
      this.tasks = validated;
    } else {
      const existingIds = new Set(this.tasks.map((t) => t.id));
      const newItems = validated.filter((t) => !existingIds.has(t.id));
      this.tasks = [...newItems, ...this.tasks];
    }

    this._save();
    return validated.length;
  }
}

// Экспорт для Node.js / тестов и браузера
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TaskStore, DEFAULT_TASKS };
}
