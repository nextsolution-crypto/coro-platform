import { Logger } from '@nestjs/common';

/**
 * Plafond quotidien d'appels à un fournisseur d'IA payant (audit M9-05).
 * Les limites par adresse n'empêchent pas un robot réparti de faire grimper
 * la facture : au-delà du plafond, l'assistant répond par un message fixe
 * jusqu'au lendemain (minuit, heure de Toronto). Compteur en mémoire : le
 * serveur est unique ; un redémarrage remet le compteur à zéro.
 */
export class DailyCallBudget {
  private day = '';
  private used = 0;
  private warned = false;
  private readonly logger: Logger;

  constructor(
    private readonly name: string,
    private readonly envVariable: string,
    private readonly defaultCap: number,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.logger = new Logger(`DailyCallBudget:${name}`);
  }

  private cap(): number {
    const value = Number(process.env[this.envVariable]);
    return Number.isInteger(value) && value > 0 ? value : this.defaultCap;
  }

  private today(): string {
    return this.now().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
  }

  /** Réserve un appel ; false si le plafond du jour est atteint. */
  tryConsume(): boolean {
    const today = this.today();
    if (today !== this.day) {
      this.day = today;
      this.used = 0;
      this.warned = false;
    }
    if (this.used >= this.cap()) {
      if (!this.warned) {
        this.warned = true;
        this.logger.warn(`Plafond quotidien atteint pour ${this.name} (${this.cap()} appels)`);
      }
      return false;
    }
    this.used += 1;
    return true;
  }

  get usage() {
    return { day: this.day, used: this.used, cap: this.cap() };
  }
}
