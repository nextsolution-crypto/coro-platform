"use client";

export type OperationalAdvisor = {
  userId: string;
  userName: string;
  hours: number;
  activities: Array<{ id: string; label: string }>;
  participatedMandates: Array<{ mandateId: string | null; projectId: string; projectName: string }>;
};

/** Jours ouvrables (lundi au vendredi) entre deux dates civiles incluses, sans dépasser aujourd'hui. */
export function workdaysBetween(from: string, to: string, today = new Date()) {
  const start = new Date(`${from}T12:00:00`);
  const todayCivil = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const end = new Date(Math.min(new Date(`${to}T12:00:00`).getTime(), todayCivil.getTime()));
  let count = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

/** Taux d'occupation facturable : heures sur les mandats / heures disponibles (8 h par jour ouvrable). */
export function occupation(hours: number, workdays: number) {
  if (workdays <= 0) return null;
  return Math.round((hours / (workdays * 8)) * 100);
}

const tone = (rate: number | null) =>
  rate === null ? "text-slate-500" : rate >= 85 ? "text-green-700" : rate >= 65 ? "text-amber-700" : "text-red-700";

export default function OccupationPanel({
  advisors,
  from,
  to,
}: {
  advisors: OperationalAdvisor[];
  from: string;
  to: string;
}) {
  const days = workdaysBetween(from, to);
  const sorted = [...advisors].sort((a, b) => b.hours - a.hours);
  const total = advisors.reduce((sum, advisor) => sum + advisor.hours, 0);
  const teamRate = occupation(total, days * Math.max(1, advisors.length));
  const showActivities = advisors.some((advisor) => advisor.activities.length > 0);
  return (
    <section
      aria-labelledby="occupation-heading"
      className="mb-6 overflow-hidden rounded-md border border-slate-200 bg-white"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-5 py-4">
        <h2 id="occupation-heading" className="font-bold">
          Occupation facturable
        </h2>
        <p className="text-sm text-slate-500">
          Heures saisies sur les mandats ÷ heures disponibles ({days} jours ouvrables × 8 h)
          {teamRate !== null && advisors.length > 1 && (
            <span className={`ml-2 font-bold ${tone(teamRate)}`}>Équipe : {teamRate} %</span>
          )}
        </p>
      </div>
      {sorted.length === 0 ? (
        <p className="p-6 text-slate-500">Aucune heure saisie pendant cette période.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">Conseiller</th>
                <th className="p-3">Heures sur mandats</th>
                <th className="p-3">Occupation</th>
                <th className="p-3">Mandats</th>
                {showActivities && <th className="p-3">Activités</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((advisor) => {
                const rate = occupation(advisor.hours, days);
                return (
                  <tr key={advisor.userId} className="border-t border-slate-100">
                    <td className="p-3 font-semibold text-slate-800">{advisor.userName}</td>
                    <td className="p-3">{advisor.hours.toLocaleString("fr-CA", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h</td>
                    <td className={`p-3 font-bold ${tone(rate)}`}>{rate === null ? "—" : `${rate} %`}</td>
                    <td className="p-3">{advisor.participatedMandates.length}</td>
                    {showActivities && <td className="p-3">{advisor.activities.length}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
