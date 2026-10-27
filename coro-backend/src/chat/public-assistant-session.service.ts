import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PublicAssistantConfig } from './public-assistant.config';
import type { PublicAssistantTurn } from './public-assistant.types';

type Session = { expiresAt: number; turns: PublicAssistantTurn[] };

@Injectable()
export class PublicAssistantSessionService {
  private readonly sessions = new Map<string, Session>();

  constructor(private readonly config: PublicAssistantConfig) {}

  open(requestedId?: string): { id: string; history: PublicAssistantTurn[] } {
    this.purgeExpired();
    const existing = requestedId ? this.sessions.get(requestedId) : undefined;
    if (existing && existing.expiresAt > Date.now()) {
      existing.expiresAt = Date.now() + this.config.sessionTtlMs;
      return { id: requestedId!, history: structuredClone(existing.turns) };
    }
    const id = randomUUID();
    this.sessions.set(id, {
      expiresAt: Date.now() + this.config.sessionTtlMs,
      turns: [],
    });
    this.enforceCapacity();
    return { id, history: [] };
  }

  append(id: string, ...turns: PublicAssistantTurn[]): void {
    const session = this.sessions.get(id);
    if (!session) return;
    session.turns = [...session.turns, ...turns]
      .slice(-this.config.maxHistoryTurns)
      .map((turn) => ({ ...turn, content: turn.content.slice(0, 2_000) }));
    while (
      session.turns.reduce((sum, turn) => sum + turn.content.length, 0) >
      this.config.maxSessionCharacters
    )
      session.turns.shift();
    session.expiresAt = Date.now() + this.config.sessionTtlMs;
  }

  clear(id: string): void {
    this.sessions.delete(id);
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions)
      if (session.expiresAt <= now) this.sessions.delete(id);
  }

  private enforceCapacity(): void {
    while (this.sessions.size > 200) {
      const oldest = this.sessions.keys().next().value as string | undefined;
      if (!oldest) return;
      this.sessions.delete(oldest);
    }
  }
}
