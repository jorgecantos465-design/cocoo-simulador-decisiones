"use client";

import { useMemo, useState } from "react";

type Currency = "ARS" | "USD";
type PaymentType = "Contado" | "Cuotas";
type Status = "Riesgo alto" | "Ajustada" | "Sostenible";

type Inputs = {
  income: number;
  expenses: number;
  cash: number;
  currency: Currency;
  months: number;
  investment: number;
  newExpense: number;
  newIncome: number;
  incomeStartMonth: number;
  expenseStartMonth: number;
  paymentType: PaymentType;
  financedAmount: number;
  installments: number;
  offeredInstallment: number;
};

type MonthRow = {
  month: number;
  currentIncome: number;
  newIncome: number;
  totalIncome: number;
  currentExpenses: number;
  newExpenses: number;
  financingPayment: number;
  upfrontInvestment: number;
  totalExpenses: number;
  monthlyResult: number;
  accumulatedCash: number;
};

const initialInputs: Inputs = {
  income: 0,
  expenses: 0,
  cash: 0,
  currency: "ARS",
  months: 12,
  investment: 0,
  newExpense: 0,
  newIncome: 0,
  incomeStartMonth: 1,
  expenseStartMonth: 1,
  paymentType: "Contado",
  financedAmount: 0,
  installments: 12,
  offeredInstallment: 0
};

const steps = [
  "Bienvenida",
  "Situación actual",
  "Nueva decisión",
  "Financiación",
  "Resultados"
];

function money(value: number, currency: Currency) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0);
}

function plain(value: number) {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0);
}

function clampMonth(value: number) {
  return Math.min(24, Math.max(1, Math.round(value || 1)));
}

function statusLabel(finalCash: number, totalResult: number, minCash: number, recoveryMonths: number | null): Status {
  if (finalCash < 0 || totalResult < 0 || minCash < 0 || recoveryMonths === null) {
    return "Riesgo alto";
  }
  const slowRecovery = recoveryMonths > 12;
  const lowCash = minCash < Math.max(1, Math.abs(totalResult) / 6);
  if (slowRecovery || lowCash) {
    return "Ajustada";
  }
  return "Sostenible";
}

function statusClasses(status: Status) {
  if (status === "Sostenible") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "Ajustada") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-red-200 bg-red-50 text-red-800";
}

function buildProjection(inputs: Inputs, customIncome = 0, customExpense = 0): MonthRow[] {
  const rows: MonthRow[] = [];
  let cash = inputs.cash;
  const upfrontInvestment =
    inputs.paymentType === "Cuotas"
      ? Math.max(inputs.investment - inputs.financedAmount, 0)
      : inputs.investment;

  for (let month = 1; month <= inputs.months; month += 1) {
    const newIncome =
      month >= inputs.incomeStartMonth ? inputs.newIncome + customIncome : 0;
    const newExpenses =
      month >= inputs.expenseStartMonth ? inputs.newExpense + customExpense : 0;
    const financingPayment =
      inputs.paymentType === "Cuotas" && month <= inputs.installments
        ? inputs.offeredInstallment
        : 0;
    const investmentImpact = month === 1 ? upfrontInvestment : 0;
    const totalIncome = inputs.income + newIncome;
    const totalExpenses =
      inputs.expenses + newExpenses + financingPayment + investmentImpact;
    const monthlyResult = totalIncome - totalExpenses;
    cash += monthlyResult;

    rows.push({
      month,
      currentIncome: inputs.income,
      newIncome,
      totalIncome,
      currentExpenses: inputs.expenses,
      newExpenses,
      financingPayment,
      upfrontInvestment: investmentImpact,
      totalExpenses,
      monthlyResult,
      accumulatedCash: cash
    });
  }

  return rows;
}

function calculate(inputs: Inputs, customIncome = 0, customExpense = 0) {
  const rows = buildProjection(inputs, customIncome, customExpense);
  const finalCash = rows.at(-1)?.accumulatedCash ?? inputs.cash;
  const totalResult = rows.reduce((acc, row) => acc + row.monthlyResult, 0);
  const minCash = Math.min(...rows.map((row) => row.accumulatedCash));
  const monthlyFlow =
    inputs.newIncome + customIncome - (inputs.newExpense + customExpense) -
    (inputs.paymentType === "Cuotas" ? inputs.offeredInstallment : 0);
  const recoveryMonths = monthlyFlow > 0 ? Math.ceil(inputs.investment / monthlyFlow) : null;
  const status = statusLabel(finalCash, totalResult, minCash, recoveryMonths);

  return { rows, finalCash, totalResult, minCash, monthlyFlow, recoveryMonths, status };
}

function NumberField({
  label,
  value,
  onChange,
  helper,
  min = 0
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  helper?: string;
  min?: number;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[#28322f]">{label}</span>
      <input
        className="h-12 rounded-lg border border-[#d9d3c7] bg-white px-4 text-base outline-none transition focus:border-[#2f6f63] focus:ring-4 focus:ring-[#2f6f63]/10"
        min={min}
        type="number"
        value={Number.isNaN(value) ? 0 : value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {helper ? <span className="text-xs leading-relaxed text-[#6d766f]">{helper}</span> : null}
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  helper
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
  helper?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[#28322f]">{label}</span>
      <select
        className="h-12 rounded-lg border border-[#d9d3c7] bg-white px-4 text-base outline-none transition focus:border-[#2f6f63] focus:ring-4 focus:ring-[#2f6f63]/10"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {helper ? <span className="text-xs leading-relaxed text-[#6d766f]">{helper}</span> : null}
    </label>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone = "neutral"
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    neutral: "border-[#d9d3c7] bg-[#fffdf8]",
    success: "border-emerald-200 bg-emerald-50",
    warning: "border-amber-200 bg-amber-50",
    danger: "border-red-200 bg-red-50"
  }[tone];

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6d766f]">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[#28322f]">{value}</p>
      {helper ? <p className="mt-2 text-sm leading-relaxed text-[#6d766f]">{helper}</p> : null}
    </div>
  );
}

function CashChart({ rows, currency }: { rows: MonthRow[]; currency: Currency }) {
  const width = 720;
  const height = 240;
  const padding = 34;
  const values = rows.map((row) => row.accumulatedCash);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(rows.length - 1, 1);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });
  const zeroY = height - padding - ((0 - min) / range) * (height - padding * 2);

  return (
    <div className="rounded-lg border border-[#d9d3c7] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-[#28322f]">Caja acumulada mes a mes</h3>
        <span className="text-sm text-[#6d766f]">{currency}</span>
      </div>
      <svg className="h-auto w-full" viewBox={`0 0 ${width} ${height}`} role="img">
        <line x1={padding} x2={width - padding} y1={zeroY} y2={zeroY} stroke="#d9d3c7" strokeDasharray="5 5" />
        <polyline fill="none" points={points.join(" ")} stroke="#2f6f63" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        {values.map((value, index) => {
          const [x, y] = points[index].split(",").map(Number);
          return <circle key={`${index}-${value}`} cx={x} cy={y} fill="#e7b85d" r="4" />;
        })}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-[#6d766f]">
        <span>Mes 1</span>
        <span>{money(values.at(-1) ?? 0, currency)}</span>
        <span>Mes {rows.length}</span>
      </div>
    </div>
  );
}

export function Simulator() {
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState<Inputs>(initialInputs);
  const [customIncome, setCustomIncome] = useState(0);
  const [customExpense, setCustomExpense] = useState(0);

  const results = useMemo(() => calculate(inputs), [inputs]);
  const difficult = useMemo(
    () => calculate(inputs, inputs.newIncome * -0.2, inputs.newExpense * 0.1),
    [inputs]
  );
  const favorable = useMemo(
    () => calculate(inputs, inputs.newIncome * 0.2, inputs.newExpense * -0.1),
    [inputs]
  );
  const custom = useMemo(
    () => calculate(inputs, customIncome, customExpense),
    [inputs, customIncome, customExpense]
  );

  const totalFinanced = inputs.paymentType === "Cuotas" ? inputs.financedAmount : 0;
  const totalPaid =
    inputs.paymentType === "Cuotas" ? inputs.offeredInstallment * inputs.installments : 0;
  const financeCost = totalPaid - totalFinanced;
  const financeCostPct = totalFinanced > 0 ? financeCost / totalFinanced : 0;

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs((current) => ({ ...current, [key]: value }));
  }

  function next() {
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function previous() {
    setStep((current) => Math.max(current - 1, 0));
  }

  return (
    <main className="min-h-screen bg-[#f6f2ea]">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d9d3c7] pb-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#2f6f63]">Cocoo</p>
            <h1 className="text-2xl font-semibold text-[#28322f] sm:text-3xl">
              Simulador de decisiones financieras
            </h1>
          </div>
          <div className="rounded-full border border-[#d9d3c7] bg-[#fffdf8] px-4 py-2 text-sm text-[#6d766f]">
            Paso {step + 1} de {steps.length}
          </div>
        </header>

        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {steps.map((item, index) => (
            <button
              key={item}
              className={`h-10 rounded-lg border px-3 text-sm font-semibold transition ${
                index === step
                  ? "border-[#2f6f63] bg-[#2f6f63] text-white"
                  : "border-[#d9d3c7] bg-[#fffdf8] text-[#6d766f]"
              }`}
              onClick={() => setStep(index)}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>

        <section className="rounded-xl border border-[#d9d3c7] bg-[#fffdf8] p-5 shadow-sm sm:p-6">
          {step === 0 ? (
            <div className="grid min-h-[420px] content-center gap-5">
              <div className="max-w-2xl">
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#2f6f63]">
                  Simulador guiado
                </p>
                <h2 className="text-4xl font-semibold leading-tight text-[#28322f] sm:text-5xl">
                  Simulador de decisiones financieras
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-[#6d766f]">
                  Evaluá si podés sostener una decisión importante antes de tomarla.
                </p>
              </div>
              <button
                className="h-12 w-fit rounded-lg bg-[#2f6f63] px-6 font-semibold text-white transition hover:bg-[#24574d]"
                onClick={next}
                type="button"
              >
                Empezar simulación
              </button>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#28322f]">Situación actual</h2>
                <p className="mt-2 text-sm text-[#6d766f]">
                  Cargá una foto simple de tu punto de partida.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <NumberField label="Ingresos mensuales actuales" value={inputs.income} onChange={(value) => update("income", value)} />
                <NumberField label="Gastos mensuales actuales, incluyendo cuotas y deudas" value={inputs.expenses} onChange={(value) => update("expenses", value)} />
                <NumberField label="Caja / ahorros disponibles" value={inputs.cash} onChange={(value) => update("cash", value)} />
                <SelectField<Currency> label="Moneda de análisis" value={inputs.currency} options={["ARS", "USD"]} onChange={(value) => update("currency", value)} />
                <NumberField label="Plazo de simulación" value={inputs.months} min={2} onChange={(value) => update("months", Math.min(24, Math.max(2, Math.round(value || 2))))} helper="Elegí entre 2 y 24 meses." />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#28322f]">Nueva decisión</h2>
                <p className="mt-2 text-sm text-[#6d766f]">
                  Separá lo que cambia por esta decisión de lo que ya pasa hoy.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <NumberField label="Inversión inicial" value={inputs.investment} onChange={(value) => update("investment", value)} />
                <NumberField label="Nuevo gasto mensual" value={inputs.newExpense} onChange={(value) => update("newExpense", value)} />
                <NumberField label="Nuevos ingresos esperados" value={inputs.newIncome} onChange={(value) => update("newIncome", value)} />
                <NumberField label="Mes desde el que impactan los nuevos ingresos" value={inputs.incomeStartMonth} min={1} onChange={(value) => update("incomeStartMonth", clampMonth(value))} />
                <NumberField label="Mes desde el que impactan los nuevos gastos" value={inputs.expenseStartMonth} min={1} onChange={(value) => update("expenseStartMonth", clampMonth(value))} />
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#28322f]">Financiación</h2>
                <p className="mt-2 text-sm text-[#6d766f]">
                  Usá el monto de cuota que te ofrecen. No calculamos tasas bancarias.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField<PaymentType> label="Forma de pago" value={inputs.paymentType} options={["Contado", "Cuotas"]} onChange={(value) => update("paymentType", value)} />
                <NumberField label="Monto financiado" value={inputs.financedAmount} onChange={(value) => update("financedAmount", value)} />
                <NumberField label="Cantidad de cuotas" value={inputs.installments} min={1} onChange={(value) => update("installments", clampMonth(value))} />
                <NumberField label="Cuota mensual ofrecida" value={inputs.offeredInstallment} onChange={(value) => update("offeredInstallment", value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard label="Total financiado" value={money(totalFinanced, inputs.currency)} />
                <MetricCard label="Total pagado" value={money(totalPaid, inputs.currency)} />
                <MetricCard label="Costo financiero estimado" value={`${money(financeCost, inputs.currency)} (${(financeCostPct * 100).toFixed(1)}%)`} helper="No reemplaza el CFT informado por el proveedor o entidad financiera." />
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#28322f]">Resultados</h2>
                <p className="mt-2 text-sm text-[#6d766f]">
                  Mirá por separado si la decisión recupera lo invertido y si podés sostenerla.
                </p>
              </div>

              <section className="grid gap-4 lg:grid-cols-3">
                <MetricCard label="Inversión analizada" value={money(inputs.investment, inputs.currency)} helper="Monto inicial que necesitás recuperar." />
                <MetricCard label="Flujo mensual nuevo" value={money(results.monthlyFlow, inputs.currency)} helper="Resultado mensual generado únicamente por esta nueva decisión." tone={results.monthlyFlow > 0 ? "success" : "danger"} />
                <MetricCard label="Recupero estimado" value={results.recoveryMonths ? `${results.recoveryMonths} meses` : "No recupera"} helper="Tiempo estimado en el que la nueva decisión recuperaría lo invertido." tone={results.recoveryMonths ? "success" : "danger"} />
              </section>

              <section className="grid gap-4 lg:grid-cols-4">
                <MetricCard label="Caja final" value={money(results.finalCash, inputs.currency)} />
                <MetricCard label="Resultado total" value={money(results.totalResult, inputs.currency)} />
                <MetricCard label="Caja mínima" value={money(results.minCash, inputs.currency)} />
                <MetricCard label="Estado" value={results.status} tone={results.status === "Sostenible" ? "success" : results.status === "Ajustada" ? "warning" : "danger"} helper="Situación actual + nueva decisión." />
              </section>

              <section className="grid gap-4 lg:grid-cols-3">
                <MetricCard label="Total financiado" value={money(totalFinanced, inputs.currency)} />
                <MetricCard label="Total pagado" value={money(totalPaid, inputs.currency)} />
                <MetricCard label="Costo financiero estimado" value={`${money(financeCost, inputs.currency)} (${(financeCostPct * 100).toFixed(1)}%)`} />
              </section>

              <CashChart rows={results.rows} currency={inputs.currency} />

              <section className="grid gap-3">
                <h3 className="text-xl font-semibold text-[#28322f]">¿Qué pasa si las cosas cambian?</h3>
                <div className="grid gap-3 lg:grid-cols-2">
                  {[
                    {
                      name: "Difícil",
                      incomeChange: inputs.newIncome * -0.2,
                      expenseChange: inputs.newExpense * 0.1,
                      result: difficult
                    },
                    {
                      name: "Favorable",
                      incomeChange: inputs.newIncome * 0.2,
                      expenseChange: inputs.newExpense * -0.1,
                      result: favorable
                    }
                  ].map((scenario) => (
                    <div key={scenario.name} className="rounded-lg border border-[#d9d3c7] bg-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="font-semibold text-[#28322f]">{scenario.name}</h4>
                        <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${statusClasses(scenario.result.status)}`}>
                          {scenario.result.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <span>Cambio ingresos</span><strong>{money(scenario.incomeChange, inputs.currency)}</strong>
                        <span>Cambio gastos</span><strong>{money(scenario.expenseChange, inputs.currency)}</strong>
                        <span>Caja final</span><strong>{money(scenario.result.finalCash, inputs.currency)}</strong>
                        <span>Caja mínima</span><strong>{money(scenario.result.minCash, inputs.currency)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 rounded-lg border border-[#d9d3c7] bg-white p-4">
                <h3 className="text-xl font-semibold text-[#28322f]">Armá tu propio escenario</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <NumberField label="Cambio ingresos" value={customIncome} min={-999999999} onChange={setCustomIncome} />
                  <NumberField label="Cambio gastos" value={customExpense} min={-999999999} onChange={setCustomExpense} />
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <MetricCard label="Caja final" value={money(custom.finalCash, inputs.currency)} />
                  <MetricCard label="Resultado total" value={money(custom.totalResult, inputs.currency)} />
                  <MetricCard label="Caja mínima" value={money(custom.minCash, inputs.currency)} />
                  <MetricCard label="Estado" value={custom.status} tone={custom.status === "Sostenible" ? "success" : custom.status === "Ajustada" ? "warning" : "danger"} />
                </div>
              </section>
            </div>
          ) : null}
        </section>

        {step > 0 ? (
          <footer className="flex justify-between gap-3">
            <button className="h-11 rounded-lg border border-[#d9d3c7] bg-[#fffdf8] px-5 font-semibold text-[#28322f]" onClick={previous} type="button">
              Atrás
            </button>
            {step < steps.length - 1 ? (
              <button className="h-11 rounded-lg bg-[#2f6f63] px-5 font-semibold text-white" onClick={next} type="button">
                Continuar
              </button>
            ) : null}
          </footer>
        ) : null}
      </div>
    </main>
  );
}
