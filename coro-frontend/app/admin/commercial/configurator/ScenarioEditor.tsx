"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CatalogComponent,
  CommercialFamily,
  DriverDefinition,
  GuidedLine,
  GuidedScenario,
} from "./configurator-types";
import { applyFamilySelection } from "./scenario-family-selection.mjs";

type CustomLine = GuidedLine & { temporary?: boolean };

export function ScenarioEditor({
  scenario,
  families,
  drivers,
  catalog,
  busy,
  onSaveMetadata,
  onSave,
  onCalculate,
  onDuplicate,
  onArchive,
  onSelect,
}: {
  scenario: GuidedScenario;
  families: CommercialFamily[];
  drivers: DriverDefinition[];
  catalog: CatalogComponent[];
  busy: boolean;
  onSaveMetadata: (name: string, description: string) => Promise<void>;
  onSave: (payload: object) => Promise<void>;
  onCalculate: () => Promise<void>;
  onDuplicate: () => Promise<void>;
  onArchive: () => Promise<void>;
  onSelect: () => Promise<void>;
}) {
  const [name, setName] = useState(scenario.name);
  const [description, setDescription] = useState(scenario.description ?? "");
  const [familyCodes, setFamilyCodes] = useState(scenario.familyCodes);
  const [lines, setLines] = useState<CustomLine[]>(scenario.lines);
  const [driverValues, setDriverValues] = useState<Record<string, string>>(
    Object.fromEntries(scenario.drivers.map((item) => [item.code, item.value])),
  );
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const selectedFamilies = families.filter((family) =>
    familyCodes.includes(family.code),
  );
  const applicableDrivers = useMemo(() => {
    const codes = new Set(
      selectedFamilies.flatMap((family) => [
        ...family.applicableDriverCodes,
        ...family.optionalDriverCodes,
      ]),
    );
    return drivers.filter((driver) => codes.has(driver.code));
  }, [drivers, selectedFamilies]);
  const availableCatalog = catalog.filter((component) =>
    component.packaging.some((policy) =>
      familyCodes.includes(policy.familyCode),
    ),
  );
  const capabilityLabels = new Map(
    selectedFamilies.flatMap((family) =>
      family.capabilityCodes.map((code) => [code, family.labelFr] as const),
    ),
  );

  function mark<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setDirty(true);
  }

  function updateLine(index: number, patch: Partial<CustomLine>) {
    mark(
      setLines,
      lines.map((line, position) =>
        position === index ? { ...line, ...patch } : line,
      ),
    );
  }

  function toggleCatalog(component: CatalogComponent) {
    const existing = lines.findIndex(
      (line) => line.priceComponentId === component.id,
    );
    if (existing >= 0) {
      mark(
        setLines,
        lines.filter((_, index) => index !== existing),
      );
      return;
    }
    mark(setLines, [
      ...lines,
      {
        id: `new-${component.id}`,
        source: "CATALOG_COMPONENT",
        priceComponentId: component.id,
        name: component.labelFr,
        pricingModel: component.pricingModel,
        chargeType: component.chargeType,
        revenueCategory: component.revenueCategory,
        billingPeriod: component.billingPeriod,
        metric: component.metric,
        quantity:
          component.pricingModel === "CAPACITY_BAND"
            ? (driverValues.ACTIVE_SITES ?? null)
            : null,
        commercialQuantityBasis:
          component.pricingModel === "CAPACITY_BAND" ? "DECLARED" : null,
        proposedUnitAmountCad: null,
        justification: null,
        displayOrder: lines.length,
        costEfforts: [],
      },
    ]);
  }

  function addCustomLine() {
    mark(setLines, [
      ...lines,
      {
        id: `new-custom-${Date.now()}`,
        temporary: true,
        source: "CUSTOM_COMPONENT",
        priceComponentId: null,
        name: "",
        pricingModel: "FLAT",
        chargeType: "ONE_TIME",
        revenueCategory: "OTHER_ONE_TIME",
        billingPeriod: null,
        metric: "FIXED",
        quantity: "1",
        commercialQuantityBasis: null,
        proposedUnitAmountCad: "",
        justification: "",
        displayOrder: lines.length,
        costEfforts: [],
      },
    ]);
  }

  async function save() {
    const catalogLines = lines
      .filter((line) => line.source === "CATALOG_COMPONENT")
      .map((line, displayOrder) => ({
        priceComponentId: line.priceComponentId,
        quantity: line.quantity || undefined,
        commercialQuantityBasis: line.commercialQuantityBasis || undefined,
        proposedUnitAmountCad: line.proposedUnitAmountCad || undefined,
        justification: line.justification || undefined,
        displayOrder,
        costEfforts: line.costEfforts,
      }));
    const customLines = lines
      .filter((line) => line.source !== "CATALOG_COMPONENT")
      .map((line, index) => ({
        lineId: line.temporary ? undefined : line.id,
        name: line.name,
        source: line.source,
        pricingModel: line.pricingModel,
        chargeType: line.chargeType,
        revenueCategory: line.revenueCategory,
        billingPeriod:
          line.chargeType === "RECURRING" ? line.billingPeriod : undefined,
        metric: line.metric,
        quantity: line.quantity || undefined,
        commercialQuantityBasis: line.commercialQuantityBasis || undefined,
        unitAmountCad: line.proposedUnitAmountCad,
        justification: line.justification,
        displayOrder: catalogLines.length + index,
        costEfforts: line.costEfforts,
      }));
    await onSave({
      lockVersion: scenario.lockVersion,
      familyCodes,
      catalogLines,
      customLines,
      driverValues: applicableDrivers
        .filter((driver) => driverValues[driver.code]?.trim())
        .map((driver) => ({
          driverCode: driver.code,
          value: driverValues[driver.code].trim(),
        })),
    });
    setDirty(false);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-72 flex-1">
            <label className="text-sm font-medium">
              Scenario name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <label className="mt-3 block text-sm font-medium">
              Description
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy || !name.trim()}
            onClick={() => onSaveMetadata(name, description)}
            className="rounded border px-3 py-2 text-sm"
          >
            Save details
          </button>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-lg font-semibold">1. Solutions</h2>
        {scenario.familyAuthoritySource === "LEGACY_INFERRED" && (
          <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Legacy scenario: confirm and save the inferred solution selection to
            make its commercial intent explicit.
          </p>
        )}
        {scenario.familyAuthoritySource === "REVIEW_REQUIRED" && (
          <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-900">
            This legacy scenario has no unambiguous commercial solution. Select
            and save the intended solution before calculation.
          </p>
        )}
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {families.map((family) => {
            const selected = familyCodes.includes(family.code);
            return (
              <label
                key={family.code}
                data-selected={selected}
                className={`rounded-lg border p-3 ${selected ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600" : ""} ${family.availability === "FUTURE" ? "opacity-50" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  disabled={family.availability === "FUTURE"}
                  checked={selected}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setFamilyCodes((current) =>
                      applyFamilySelection(current, family.code, checked),
                    );
                    setDirty(true);
                  }}
                />
                <strong className="ml-2">{family.labelFr}</strong>
                <p className="mt-1 text-xs text-slate-500">
                  {family.descriptionFr} · {family.availability}
                </p>
              </label>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-lg font-semibold">2. Catalog components</h2>
        <p className="mt-1 text-sm text-slate-500">
          Commercial semantics and catalog prices remain controlled by the
          selected catalog.
        </p>
        <div className="mt-3 space-y-2">
          {availableCatalog.map((component) => {
            const chosen = lines.some(
              (line) => line.priceComponentId === component.id,
            );
            return (
              <label
                key={component.id}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <input
                  type="checkbox"
                  disabled={!component.selectable}
                  checked={chosen}
                  onChange={() => toggleCatalog(component)}
                />
                <span className="flex-1">
                  <strong>{component.labelFr}</strong>
                  {component.packaging
                    .filter((policy) => familyCodes.includes(policy.familyCode))
                    .map((policy) => (
                      <span
                        key={policy.familyCode}
                        className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs"
                      >
                        {policy.role === "REQUIRED"
                          ? "Requis"
                          : policy.role === "DEFAULT_SELECTED"
                            ? "Présélectionné"
                            : "Optionnel"}
                      </span>
                    ))}
                  <span className="block text-xs text-slate-500">
                    {capabilityLabels.get(component.capabilityCode) ??
                      "Solution"}
                    {" · "}
                    {component.chargeType === "RECURRING"
                      ? "Recurring"
                      : "One-time"}
                    {" · "}
                    {component.pricingModel === "FLAT"
                      ? "Fixed price"
                      : component.pricingModel === "PER_UNIT"
                        ? "Per unit"
                        : component.pricingModel === "CAPACITY_BAND"
                          ? "Total price for declared capacity band"
                          : "Catalog-defined"}
                    {" · "}
                    {component.catalogAmountCad
                      ? `${component.catalogAmountCad} CAD`
                      : "Tiered/catalog-defined"}
                  </span>
                </span>
              </label>
            );
          })}
          {!!familyCodes.length && !availableCatalog.length && (
            <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">
              No catalog components are configured for this solution. Catalog
              setup is required.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">3. Commercial lines</h2>
          <button
            type="button"
            onClick={addCustomLine}
            className="rounded border px-3 py-2 text-sm"
          >
            Add controlled custom line
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {lines.map((line, index) => (
            <div key={line.id} className="rounded-lg border p-3">
              <div className="flex justify-between gap-2">
                <strong>
                  {line.source === "CATALOG_COMPONENT"
                    ? line.name
                    : "Custom commercial line"}
                </strong>
                <button
                  type="button"
                  onClick={() =>
                    mark(
                      setLines,
                      lines.filter((_, position) => position !== index),
                    )
                  }
                  className="text-sm text-red-700"
                >
                  Remove
                </button>
              </div>
              {line.source !== "CATALOG_COMPONENT" && (
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <label className="text-xs">
                    Business label
                    <input
                      value={line.name}
                      onChange={(event) =>
                        updateLine(index, { name: event.target.value })
                      }
                      className="mt-1 w-full rounded border p-2"
                    />
                  </label>
                  <label className="text-xs">
                    Revenue category
                    <select
                      value={line.revenueCategory ?? "OTHER_ONE_TIME"}
                      onChange={(event) =>
                        updateLine(index, {
                          revenueCategory: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded border p-2"
                    >
                      <option value="PROFESSIONAL_SERVICE">
                        Professional service
                      </option>
                      <option value="IMPLEMENTATION">Implementation</option>
                      <option value="SAAS">SaaS</option>
                      <option value="OTHER_RECURRING">Other recurring</option>
                      <option value="OTHER_ONE_TIME">Other one-time</option>
                    </select>
                  </label>
                  <label className="text-xs">
                    Line type
                    <select
                      value={line.source}
                      onChange={(event) =>
                        updateLine(index, {
                          source: event.target.value as GuidedLine["source"],
                        })
                      }
                      className="mt-1 w-full rounded border p-2"
                    >
                      <option value="CUSTOM_COMPONENT">Custom component</option>
                      <option value="PROFESSIONAL_SERVICE">
                        Professional service
                      </option>
                    </select>
                  </label>
                  <label className="text-xs">
                    Charge
                    <select
                      value={line.chargeType}
                      onChange={(event) =>
                        updateLine(index, {
                          chargeType: event.target
                            .value as GuidedLine["chargeType"],
                          billingPeriod:
                            event.target.value === "RECURRING" ? "YEAR" : null,
                        })
                      }
                      className="mt-1 w-full rounded border p-2"
                    >
                      <option value="ONE_TIME">One-time</option>
                      <option value="RECURRING">Recurring</option>
                    </select>
                  </label>
                  <label className="text-xs">
                    Price basis
                    <select
                      value={line.pricingModel}
                      onChange={(event) =>
                        updateLine(index, {
                          pricingModel: event.target
                            .value as GuidedLine["pricingModel"],
                          metric:
                            event.target.value === "PER_UNIT"
                              ? "HOUR"
                              : "FIXED",
                        })
                      }
                      className="mt-1 w-full rounded border p-2"
                    >
                      <option value="FLAT">Fixed engagement</option>
                      <option value="PER_UNIT">Per hour</option>
                    </select>
                  </label>
                </div>
              )}
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                {(line.pricingModel === "PER_UNIT" ||
                  line.source === "CATALOG_COMPONENT") && (
                  <label className="text-xs">
                    Declared quantity
                    <input
                      type="number"
                      min="0"
                      step="0.000001"
                      value={line.quantity ?? ""}
                      onChange={(event) =>
                        updateLine(index, { quantity: event.target.value })
                      }
                      className="mt-1 w-full rounded border p-2"
                    />
                  </label>
                )}
                <label className="text-xs">
                  Quantity source / Source de quantité
                  <select
                    value={line.commercialQuantityBasis ?? ""}
                    onChange={(event) =>
                      updateLine(index, {
                        commercialQuantityBasis:
                          event.target.value === "DECLARED" ? "DECLARED" : null,
                      })
                    }
                    className="mt-1 w-full rounded border p-2"
                  >
                    <option value="">Select / Sélectionner</option>
                    <option value="DECLARED">
                      Declared by commercial operator / Déclarée par l’opérateur
                      commercial
                    </option>
                  </select>
                </label>
                <label className="text-xs">
                  {line.source === "CATALOG_COMPONENT"
                    ? "Proposed unit price CAD (optional)"
                    : "Unit price CAD"}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.proposedUnitAmountCad ?? ""}
                    onChange={(event) =>
                      updateLine(index, {
                        proposedUnitAmountCad: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded border p-2"
                  />
                </label>
                <label className="text-xs">
                  Justification
                  <input
                    value={line.justification ?? ""}
                    onChange={(event) =>
                      updateLine(index, { justification: event.target.value })
                    }
                    className="mt-1 w-full rounded border p-2"
                  />
                </label>
              </div>
              {line.pricingModel !== "PER_UNIT" && (
                <div className="mt-3 rounded bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-600">
                    Internal delivery effort — never shown to the customer
                  </p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {(
                      ["DELIVERY_PROFESSIONAL", "SENIOR_REVIEWER"] as const
                    ).map((role) => {
                      const effort = line.costEfforts.find(
                        (item) => item.role === role,
                      );
                      return (
                        <label key={role} className="text-xs">
                          {role === "DELIVERY_PROFESSIONAL"
                            ? "Delivery professional hours"
                            : "Senior reviewer hours"}
                          <input
                            type="number"
                            min="0"
                            step="0.000001"
                            value={effort?.hours ?? ""}
                            onChange={(event) => {
                              const remaining = line.costEfforts.filter(
                                (item) => item.role !== role,
                              );
                              updateLine(index, {
                                costEfforts: event.target.value
                                  ? [
                                      ...remaining,
                                      {
                                        role,
                                        hours: event.target.value,
                                        justification: null,
                                      },
                                    ]
                                  : remaining,
                              });
                            }}
                            className="mt-1 w-full rounded border p-2"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
          {!lines.length && (
            <p className="text-sm text-slate-500">
              No commercial line selected.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-lg font-semibold">4. Business inputs</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {applicableDrivers.map((driver) => (
            <label key={driver.code} className="text-sm font-medium">
              {driver.labelFr}
              <input
                type={driver.valueType === "TEXT" ? "text" : "number"}
                min={driver.valueType === "TEXT" ? undefined : "0"}
                step={
                  driver.valueType === "INTEGER"
                    ? "1"
                    : driver.valueType === "MONEY"
                      ? "0.01"
                      : "0.000001"
                }
                value={driverValues[driver.code] ?? ""}
                onChange={(event) =>
                  mark(setDriverValues, {
                    ...driverValues,
                    [driver.code]: event.target.value,
                  })
                }
                className="mt-1 w-full rounded-lg border p-2"
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                {driver.helpFr}
              </span>
            </label>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {scenario.packaging.status !== "READY" && (
          <p className="w-full rounded bg-amber-50 p-3 text-sm text-amber-800">
            Composition incomplète : {scenario.packaging.blockers.join(" · ")}
          </p>
        )}
        <button
          type="button"
          disabled={busy || !dirty}
          onClick={save}
          className="rounded bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-40"
        >
          Save configuration
        </button>
        <button
          type="button"
          disabled={
            busy ||
            dirty ||
            !lines.length ||
            scenario.packaging.status !== "READY"
          }
          onClick={onCalculate}
          className="rounded bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-40"
        >
          {scenario.latestResult ? "Recalculate" : "Calculate"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDuplicate}
          className="rounded border px-4 py-2"
        >
          Duplicate
        </button>
        <button
          type="button"
          disabled={busy || scenario.selected}
          onClick={onArchive}
          className="rounded border px-4 py-2 text-red-700"
        >
          Archive
        </button>
        <button
          type="button"
          disabled={busy || scenario.selected || dirty}
          onClick={onSelect}
          className="rounded border px-4 py-2"
        >
          Select scenario
        </button>
      </div>
      {dirty && (
        <p className="text-sm text-amber-800">
          Unsaved changes — save before calculation or navigation.
        </p>
      )}
    </div>
  );
}
