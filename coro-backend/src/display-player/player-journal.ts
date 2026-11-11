import { PlayerJournalEvent, PlayerJournalEventType } from './player-contracts';

export class LocalPlayerJournal {
  private readonly events: PlayerJournalEvent[] = [];

  constructor(private readonly maximumEntries = 2_000) {}

  append(
    type: PlayerJournalEventType,
    occurredAt: Date,
    detailCode?: string,
  ): PlayerJournalEvent {
    const event: PlayerJournalEvent = {
      sequence: (this.events.at(-1)?.sequence ?? 0) + 1,
      occurredAt: occurredAt.toISOString(),
      type,
      ...(detailCode ? { detailCode } : {}),
    };
    this.events.push(event);
    if (this.events.length > this.maximumEntries)
      this.events.splice(0, this.events.length - this.maximumEntries);
    return event;
  }

  read(): readonly PlayerJournalEvent[] {
    return this.events.map((event) => ({ ...event }));
  }
}
