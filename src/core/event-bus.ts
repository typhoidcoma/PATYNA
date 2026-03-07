import type { EventMap } from '@/types/events.ts';

type EventCallback<T> = T extends void ? () => void : (payload: T) => void;

export class EventBus {
  private listeners = new Map<string, Set<Function>>();

  on<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>): () => void {
    if (!this.listeners.has(event as string)) {
      this.listeners.set(event as string, new Set());
    }
    this.listeners.get(event as string)!.add(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  off<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>): void {
    this.listeners.get(event as string)?.delete(callback);
  }

  emit<K extends keyof EventMap>(
    event: K,
    ...args: EventMap[K] extends void ? [] : [EventMap[K]]
  ): void {
    this.listeners.get(event as string)?.forEach((cb) => {
      try {
        (cb as Function)(...args);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event as string}":`, err);
      }
    });
  }
}

/** Singleton event bus */
export const eventBus = new EventBus();
