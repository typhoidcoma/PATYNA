/**
 * Demo state engine — manages synthetic dashboard data and builds
 * LLM context strings for every message sent to the Aelora backend.
 *
 * On task completion, it returns an enriched message (context + announcement)
 * that gets sent via CommManager.sendMessage(). The real LLM responds naturally.
 */

import { eventBus } from '@/core/event-bus.ts';
import { getFixture } from './demo-data.ts';
import type { DemoGoal, DemoTask, ScheduleItem } from './demo-types.ts';

export interface DemoProgress {
  completed: number;
  total: number;
  points: number;
  maxPoints: number;
}

export class DemoState {
  private goals: DemoGoal[] = [];
  private tasks: DemoTask[] = [];
  private schedule: ScheduleItem[] = [];
  private _maxPoints = 0;

  constructor() {
    this.loadFixture();
  }

  // ── Getters ──

  getGoals(): DemoGoal[] {
    return this.goals;
  }

  getTasks(goalId?: string): DemoTask[] {
    if (goalId) return this.tasks.filter((t) => t.goalId === goalId);
    return this.tasks;
  }

  getSchedule(): ScheduleItem[] {
    return this.schedule;
  }

  getProgress(): DemoProgress {
    const completed = this.tasks.filter((t) => t.completed).length;
    const points = this.tasks.filter((t) => t.completed).reduce((s, t) => s + t.points, 0);
    return {
      completed,
      total: this.tasks.length,
      points,
      maxPoints: this._maxPoints,
    };
  }

  // ── Actions ──

  /**
   * Complete a task. Returns the enriched message to send to the LLM,
   * or null if the task was already completed or not found.
   */
  completeTask(taskId: string): string | null {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task || task.completed) return null;

    task.completed = true;

    const progress = this.getProgress();

    // Emit demo event for UI updates
    eventBus.emit('demo:taskComplete', {
      taskId,
      points: progress.points,
      totalPoints: progress.points,
      maxPoints: progress.maxPoints,
    });

    // Build enriched message for the LLM
    const allDone = progress.completed === progress.total;
    let announcement: string;

    if (allDone) {
      announcement = `I just completed the LAST task "${task.title}" and earned ${task.points} points! ALL ${progress.total} tasks are done — ${progress.maxPoints}/${progress.maxPoints} points! Celebrate with me!`;
    } else {
      announcement = `I just completed the task "${task.title}" and earned ${task.points} points. My progress is now ${progress.points}/${progress.maxPoints} points (${progress.completed}/${progress.total} tasks done).`;
    }

    return `${this.buildContext()}\n\n${announcement}`;
  }

  /** Wrap a user's free-text message with dashboard context. */
  wrapMessage(userText: string): string {
    return `${this.buildContext()}\n\n${userText}`;
  }

  /** Reset all state and return a priming message for the LLM. */
  reset(): string {
    this.loadFixture();
    eventBus.emit('demo:reset');
    return `${this.buildContext()}\n\nThe dashboard has been reset. All tasks are back to incomplete. Let's start fresh!`;
  }

  /** Build the initial priming message for the LLM on connect. */
  buildPrimingMessage(username: string): string {
    return `${this.buildContext()}\n\nYou are Patyna, a friendly and enthusiastic AI productivity assistant. The user's name is ${username}. Greet them warmly and briefly mention what's on their schedule and tasks for today. Keep it concise — 2-3 sentences max.`;
  }

  // ── Context builder ──

  buildContext(): string {
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const dateFull = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const scheduleLines = this.schedule
      .map((s) => `  ${s.time} — ${s.title} (${s.type})`)
      .join('\n');

    const goalLines = this.goals
      .map((g) => {
        const tasks = this.getTasks(g.id);
        const done = tasks.filter((t) => t.completed).length;
        return `  ${g.title} (${done}/${tasks.length} tasks done)`;
      })
      .join('\n');

    const remaining = this.tasks
      .filter((t) => !t.completed)
      .map((t) => `  ${t.title} (${t.points}pts)`)
      .join('\n');

    const completed = this.tasks
      .filter((t) => t.completed)
      .map((t) => `  ${t.title} (${t.points}pts)`)
      .join('\n');

    const progress = this.getProgress();

    let ctx = `[Dashboard Context]\nToday: ${dayName}, ${dateFull}\n`;
    ctx += `\nSchedule:\n${scheduleLines}\n`;
    ctx += `\nGoals:\n${goalLines}\n`;

    if (remaining) {
      ctx += `\nTasks remaining:\n${remaining}\n`;
    }
    if (completed) {
      ctx += `\nTasks completed:\n${completed}\n`;
    }

    ctx += `\nProgress: ${progress.points}/${progress.maxPoints} points (${progress.completed}/${progress.total} tasks)`;

    return ctx;
  }

  // ── Internal ──

  private loadFixture(): void {
    const fixture = getFixture();
    this.goals = fixture.goals;
    this.tasks = fixture.tasks;
    this.schedule = fixture.schedule;
    this._maxPoints = this.tasks.reduce((s, t) => s + t.points, 0);
  }
}
