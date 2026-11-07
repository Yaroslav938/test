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

test('TaskStore: Добавление новой задачи', () => {
  const storage = createMockStorage({ test_tasks: '[]' });
  const store = new TaskStore('test_tasks', storage);

  const newTask = store.addTask({ text: 'Изучить Antigravity AI', category: 'study' });
  assert.equal(newTask.text, 'Изучить Antigravity AI');
  assert.equal(newTask.category, 'study');
  assert.equal(newTask.completed, false);
  assert.ok(newTask.id);
  assert.ok(newTask.createdAt);

  assert.equal(store.getAll().length, 1);
  assert.throws(() => store.addTask({ text: '   ' }), /Текст задачи не может быть пустым/);
});

test('TaskStore: Переключение статуса выполнения', () => {
  const storage = createMockStorage({ test_tasks: '[]' });
  const store = new TaskStore('test_tasks', storage);

  const task = store.addTask({ text: 'Проверить чекбокс' });
  assert.equal(task.completed, false);

  const toggled = store.toggleTask(task.id);
  assert.equal(toggled.completed, true);

  const toggledAgain = store.toggleTask(task.id);
  assert.equal(toggledAgain.completed, false);
});

test('TaskStore: Редактирование текста задачи', () => {
  const storage = createMockStorage({ test_tasks: '[]' });
  const store = new TaskStore('test_tasks', storage);

  const task = store.addTask({ text: 'Начальный текст' });
  const updated = store.editTask(task.id, 'Обновленный текст');

  assert.equal(updated.text, 'Обновленный текст');
  assert.ok(updated.updatedAt);
  assert.throws(() => store.editTask(task.id, ''), /Текст задачи не может быть пустым/);
});

test('TaskStore: Удаление конкретной задачи', () => {
  const storage = createMockStorage({ test_tasks: '[]' });
  const store = new TaskStore('test_tasks', storage);

  const t1 = store.addTask({ text: 'Задача 1' });
  const t2 = store.addTask({ text: 'Задача 2' });

  assert.equal(store.getAll().length, 2);
  const deleted = store.deleteTask(t1.id);
  assert.equal(deleted, true);
  assert.equal(store.getAll().length, 1);
  assert.equal(store.getAll()[0].id, t2.id);
});

test('TaskStore: Очистка выполненных задач', () => {
  const storage = createMockStorage({ test_tasks: '[]' });
  const store = new TaskStore('test_tasks', storage);

  const t1 = store.addTask({ text: 'Задача 1' });
  const t2 = store.addTask({ text: 'Задача 2' });
  store.toggleTask(t1.id);

  assert.equal(store.getStats().completed, 1);
  assert.equal(store.getStats().active, 1);

  const clearedCount = store.clearCompleted();
  assert.equal(clearedCount, 1);
  assert.equal(store.getAll().length, 1);
  assert.equal(store.getAll()[0].id, t2.id);
});

test('TaskStore: Статистика и процент выполнения', () => {
  const storage = createMockStorage({ test_tasks: '[]' });
  const store = new TaskStore('test_tasks', storage);

  assert.deepEqual(store.getStats(), { total: 0, completed: 0, active: 0, percent: 0 });

  const t1 = store.addTask({ text: '1' });
  const t2 = store.addTask({ text: '2' });
  store.toggleTask(t1.id);

  assert.deepEqual(store.getStats(), { total: 2, completed: 1, active: 1, percent: 50 });
});

test('TaskStore: Фильтрация и поиск', () => {
  const storage = createMockStorage({ test_tasks: '[]' });
  const store = new TaskStore('test_tasks', storage);

  const t1 = store.addTask({ text: 'Купить молоко' });
  const t2 = store.addTask({ text: 'Написать код' });
  store.toggleTask(t1.id);

  const active = store.getFilteredTasks({ filter: 'active' });
  assert.equal(active.length, 1);
  assert.equal(active[0].id, t2.id);

  const completed = store.getFilteredTasks({ filter: 'completed' });
  assert.equal(completed.length, 1);
  assert.equal(completed[0].id, t1.id);

  const searched = store.getFilteredTasks({ searchQuery: 'молоко' });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].id, t1.id);
});
