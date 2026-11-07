/**
 * TaskStore: Управление состоянием задач и персистенция в LocalStorage
 */

const DEFAULT_TASKS = [
  {
    id: 'demo-1',
    text: 'Ознакомиться с возможностями To-Do списка',
    completed: true,
    category: 'work',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'demo-2',
    text: 'Добавить собственную задачу через форму выше',
    completed: false,
    category: 'study',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'demo-3',
    text: 'Проверить сохранение задач после обновления страницы (F5)',
    completed: false,
    category: 'urgent',
    createdAt: new Date().toISOString(),
  },
];

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

    // Хранилище в памяти как надежный fallback
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
   * @returns {Object} Созданная задача
   */
  addTask({ text, category = 'general' }) {
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
    this._save();
    return task;
  }

  /**
   * Редактировать текст задачи
   * @param {string} id
   * @param {string} newText
   * @returns {Object|null}
   */
  editTask(id, newText) {
    const trimmed = (newText || '').trim();
    if (!trimmed) {
      throw new Error('Текст задачи не может быть пустым');
    }

    const task = this.tasks.find((t) => t.id === id);
    if (!task) return null;

    task.text = trimmed;
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
   * Получить агрегированную статистику
   */
  getStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter((t) => t.completed).length;
    const active = total - completed;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    return { total, completed, active, percent };
  }

  /**
   * Фильтрация и поиск задач
   * @param {Object} options
   * @param {'all'|'active'|'completed'} [options.filter='all']
   * @param {string} [options.searchQuery='']
   */
  getFilteredTasks({ filter = 'all', searchQuery = '' } = {}) {
    let result = [...this.tasks];

    if (filter === 'active') {
      result = result.filter((t) => !t.completed);
    } else if (filter === 'completed') {
      result = result.filter((t) => t.completed);
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((t) => t.text.toLowerCase().includes(q));
    }

    return result;
  }
}

// Экспорт для Node.js / тестов и браузера
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TaskStore, DEFAULT_TASKS };
}
