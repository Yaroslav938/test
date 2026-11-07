const test = require('node:test');
const assert = require('node:assert/strict');
const { TaskStore } = require('../js/store.js');

function createMockStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

test('TaskStore: Загрузка задач по умолчанию при первом запуске', () => {
  const storage = createMockStorage();
  const store = new TaskStore('test_tasks', storage);

  const tasks = store.getAll();
  assert.equal(tasks.length >= 3, true);
  assert.equal(tasks.some((t) => t.completed === true), true);
  assert.equal(tasks.some((t) => t.completed === false), true);
});

test('TaskStore: Добавление новой задачи с приоритетом и дедлайном', () => {
  const storage = createMockStorage({ test_tasks: '[]' });
  const store = new TaskStore('test_tasks', storage);

  const newTask = store.addTask({
    text: 'Изучить Antigravity AI',
    category: 'study',
    priority: 'high',
    dueDate: '2026-11-20',
  });
  assert.equal(newTask.text, 'Изучить Antigravity AI');
  assert.equal(newTask.category, 'study');
  assert.equal(newTask.priority, 'high');
  assert.equal(newTask.dueDate, '2026-11-20');
  assert.equal(newTask.completed, false);
  assert.ok(newTask.id);

  assert.equal(store.getAll().length, 1);
  assert.throws(() => store.addTask({ text: '   ' }), /Текст задачи не может быть пустым/);
});

test('TaskStore: Переключение статуса и завершение', () => {
  const storage = createMockStorage({ test_tasks: '[]' });
  const store = new TaskStore('test_tasks', storage);

  const task = store.addTask({ text: 'Проверить чекбокс' });
  assert.equal(task.completed, false);

  const toggled = store.toggleTask(task.id);
  assert.equal(toggled.completed, true);
  assert.ok(toggled.completedAt);

  const toggledAgain = store.toggleTask(task.id);
  assert.equal(toggledAgain.completed, false);
  assert.equal(toggledAgain.completedAt, null);
});

test('TaskStore: Редактирование текста и параметров задачи', () => {
  const storage = createMockStorage({ test_tasks: '[]' });
  const store = new TaskStore('test_tasks', storage);

  const task = store.addTask({ text: 'Начальный текст' });
  const updated = store.editTask(task.id, {
    text: 'Обновленный текст',
    priority: 'high',
    dueDate: '2026-12-01',
  });

  assert.equal(updated.text, 'Обновленный текст');
  assert.equal(updated.priority, 'high');
  assert.equal(updated.dueDate, '2026-12-01');
  assert.ok(updated.updatedAt);
});

test('TaskStore: Сортировка по приоритету и дедлайну', () => {
  const storage = createMockStorage({ test_tasks: '[]' });
  const store = new TaskStore('test_tasks', storage);

  store.addTask({ text: 'Низкий приоритет', priority: 'low', dueDate: '2026-11-25' });
  store.addTask({ text: 'Высокий приоритет', priority: 'high', dueDate: '2026-11-10' });
  store.addTask({ text: 'Средний приоритет', priority: 'medium', dueDate: '2026-11-15' });

  const byPriority = store.getFilteredTasks({ sortBy: 'priority-desc' });
  assert.equal(byPriority[0].priority, 'high');
  assert.equal(byPriority[1].priority, 'medium');
  assert.equal(byPriority[2].priority, 'low');

  const byDate = store.getFilteredTasks({ sortBy: 'due-date' });
  assert.equal(byDate[0].dueDate, '2026-11-10');
  assert.equal(byDate[1].dueDate, '2026-11-15');
  assert.equal(byDate[2].dueDate, '2026-11-25');
});

test('TaskStore: Экспорт и импорт данных в формате JSON', () => {
  const storage = createMockStorage({ test_tasks: '[]' });
  const store = new TaskStore('test_tasks', storage);

  store.addTask({ text: 'Экспортируемая задача', category: 'work', priority: 'high' });
  const jsonOutput = store.exportData();

  assert.ok(jsonOutput.includes('TaskFlow'));
  assert.ok(jsonOutput.includes('Экспортируемая задача'));

  const newStorage = createMockStorage({ test_tasks: '[]' });
  const newStore = new TaskStore('test_tasks', newStorage);

  const importedCount = newStore.importData(jsonOutput, true);
  assert.equal(importedCount, 1);
  assert.equal(newStore.getAll()[0].text, 'Экспортируемая задача');
  assert.equal(newStore.getAll()[0].priority, 'high');
});
