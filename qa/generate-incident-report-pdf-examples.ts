import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { IncidentReportPdfRenderer } from "../coro-backend/src/incident-reports/incident-report-pdf.renderer";

async function main() {
  const output = join(__dirname, "..", "docs", "qa", "examples");
  mkdirSync(output, { recursive: true });
  const renderer = new IncidentReportPdfRenderer();
  const schema = {
    schemaVersion: "1.0" as const,
    sections: [
      {
        key: "identification",
        title: "Identification",
        titleEn: "Identification",
        fields: [
          {
            key: "occurredAt",
            label: "Date et heure",
            labelEn: "Date and time",
            type: "DATETIME" as const,
          },
          {
            key: "location",
            label: "Lieu",
            labelEn: "Location",
            type: "ROOM" as const,
          },
          {
            key: "summary",
            label: "Resume",
            labelEn: "Summary",
            type: "LONG_TEXT" as const,
          },
          {
            key: "unused",
            label: "Champ vide masque",
            type: "SHORT_TEXT" as const,
          },
        ],
      },
      {
        key: "people",
        title: "Personnes et temoins",
        titleEn: "People and witnesses",
        fields: [
          {
            key: "people",
            label: "Personnes",
            labelEn: "People",
            type: "REPEATABLE_SECTION" as const,
          },
        ],
      },
    ],
  };
  const common = {
    reportNumber: "IR-DEMO-2026-001",
    title: "Situation inhabituelle - exercice synthetique",
    versionNumber: 2,
    reportId: "00000000-0000-4000-8000-000000000001",
    reportVersionId: "00000000-0000-4000-8000-000000000002",
    buildingName: "Tour Exemple - donnees fictives",
    contentHash:
      "64f07c92a7a219a80ab452e0772118a8f91045f47ac359a784f9a146a0acfa9d",
    content: {
      occurredAt: "2026-12-15T10:30:00-05:00",
      location: "Hall principal",
      summary:
        "Exercice controle. Une anomalie synthetique a ete constatee; aucune personne reelle n'est impliquee.",
      people: [
        { name: "Alex Exemple", role: "TEMOIN" },
        { name: "Morgan Exemple", role: "INTERVENANT" },
      ],
    },
    schema,
    approvals: [
      {
        decision: "APPROVED",
        actorRoleSnapshot: "SUPERVISEUR QA",
        decidedAt: new Date("2026-12-15T16:00:00Z"),
      },
    ],
    generatedAt: new Date("2026-12-15T16:05:00Z"),
  };
  writeFileSync(
    join(output, "incident-report-letter-fr.pdf"),
    await renderer.render({ ...common, locale: "fr-CA", pageFormat: "LETTER" }),
  );
  writeFileSync(
    join(output, "incident-report-a4-en.pdf"),
    await renderer.render({
      ...common,
      locale: "en-CA",
      pageFormat: "A4",
      title: "Unusual situation - synthetic exercise",
      buildingName: "Example Tower - fictional data",
      content: {
        occurredAt: "2026-12-15T10:30:00-05:00",
        location: "Main lobby",
        summary:
          "Controlled exercise. A synthetic anomaly was observed; no real person is involved.",
        people: [
          { name: "Alex Example", role: "WITNESS" },
          { name: "Morgan Example", role: "RESPONDER" },
        ],
      },
    }),
  );
}
void main();
