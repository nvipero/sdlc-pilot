import { useEffect, useState, type FormEvent } from 'react';
import { STATUSES, addTask, moveTask, type Task } from './tasks';
import { loadTasks, saveTasks } from './storage';

export function App() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks(window.localStorage));
  const [title, setTitle] = useState('');

  useEffect(() => {
    saveTasks(window.localStorage, tasks);
  }, [tasks]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (title.trim() === '') return;
    setTasks((current) => addTask(current, title, crypto.randomUUID()));
    setTitle('');
  }

  return (
    <main>
      <h1>Tasks</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="task-title">Title</label>
        <input
          id="task-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <button type="submit">Add task</button>
      </form>
      <div className="swimlanes">
        {STATUSES.map((status) => {
          const headingId = `lane-${status}`;
          return (
            <section key={status} aria-labelledby={headingId}>
              <h2 id={headingId}>{status}</h2>
              <ul>
                {tasks
                  .filter((task) => task.status === status)
                  .map((task) => (
                    <li key={task.id}>
                      <span>{task.title}</span>
                      {STATUSES.filter((s) => s !== status).map((target) => (
                        <button
                          key={target}
                          type="button"
                          onClick={() => setTasks((current) => moveTask(current, task.id, target))}
                        >
                          Move to {target}
                        </button>
                      ))}
                    </li>
                  ))}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
