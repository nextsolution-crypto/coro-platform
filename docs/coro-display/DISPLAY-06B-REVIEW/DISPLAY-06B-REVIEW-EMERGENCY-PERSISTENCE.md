# DISPLAY-06B-REVIEW — Persistance de l'urgence

L'enveloppe HMAC-SHA256 refuse toute corruption et l'écriture est atomique. Correction : mode et priorité doivent correspondre, version strictement croissante, état inférieur refusé sans `governedClear`, et écritures concurrentes sérialisées. Le test prouve qu'une urgence réelle survit à une tentative d'exercice et qu'un clear explicite est nécessaire.

L'ordre reste `EMERGENCY_REAL > EMERGENCY_EXERCISE > PERMANENT_PLAN > NORMAL_CYCLE`; aucun timer n'efface une urgence et le scheduler affiche toujours le plan hors mode normal.

Limites : l'autorité cryptographique de `governedClear`, le journal append-only et la protection OS de la clé HMAC seront fournis par le Gateway/keystore. Une corruption déclenche une erreur conservatrice, mais ne crée pas un incident réel fictif.
