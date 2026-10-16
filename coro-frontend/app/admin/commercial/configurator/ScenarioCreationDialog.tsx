"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

const DEFAULT_SCENARIO_NAME = "Standard";
const MAX_SCENARIO_NAME_LENGTH = 255;

export function ScenarioCreationDialog({
  busy,
  onCancel,
  onCreate,
}: {
  busy: boolean;
  onCancel: () => void;
  onCreate: (name: string) => Promise<string | null>;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(DEFAULT_SCENARIO_NAME);
  const [error, setError] = useState("");

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    inputRef.current?.select();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [busy, onCancel]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError("Le nom du scénario est requis.");
      inputRef.current?.focus();
      return;
    }
    if (normalizedName.length > MAX_SCENARIO_NAME_LENGTH) {
      setError(
        `Le nom doit contenir au plus ${MAX_SCENARIO_NAME_LENGTH} caractères.`,
      );
      inputRef.current?.focus();
      return;
    }
    setError("");
    const backendError = await onCreate(normalizedName);
    if (backendError) {
      setError(backendError);
      inputRef.current?.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scenario-creation-title"
      aria-describedby="scenario-creation-description"
    >
      <section
        ref={dialogRef}
        className="w-full max-w-lg rounded-xl border bg-white p-5 shadow-xl"
      >
        <h2 id="scenario-creation-title" className="text-xl font-semibold">
          Créer un scénario
        </h2>
        <p
          id="scenario-creation-description"
          className="mt-2 text-sm text-slate-600"
        >
          Nommez cette variante commerciale. Vous pourrez ensuite configurer,
          comparer et calculer le scénario.
        </p>
        <form className="mt-5" onSubmit={(event) => void submit(event)}>
          <label htmlFor="scenario-name" className="block text-sm font-medium">
            Nom du scénario
          </label>
          <input
            ref={inputRef}
            id="scenario-name"
            name="scenarioName"
            value={name}
            maxLength={MAX_SCENARIO_NAME_LENGTH}
            disabled={busy}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? "scenario-name-error" : undefined}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError("");
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-60"
          />
          {error && (
            <p
              id="scenario-name-error"
              role="alert"
              className="mt-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="rounded border px-4 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-60"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-slate-900 px-4 py-2 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-60"
            >
              {busy ? "Création…" : "Créer"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
