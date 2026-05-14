"use client";

import { useMemo, useState } from "react";

type Currency = "ARS" | "USD";
type PaymentType = "Contado" | "Cuotas";
type Status = "Riesgo alto" | "Ajustada" | "Sostenible";
type DecisionType = "Compra personal" | "Inversión / oportunidad" | "Proyecto que puede generar ingresos";

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
  exitValue: number;
  exitMonth: number;
  paymentType: PaymentType;
  financedAmount: number;
  installments: number;
  offeredInstallment: number;
};

type MonthRow = {
  month: number;
  currentIncome: number;
  newIncome: number;
  exitIncome: number;
  totalIncome: number;
  currentExpenses: number;
  newExpenses: number;
  financingPayment: number;
  upfrontInvestment: number;
  totalExpenses: number;
  monthlyResult: number;
  accumulatedCash: number;
};

type Calculation = {
  rows: MonthRow[];
  finalCash: number;
  totalResult: number;
  minCash: number;
  monthlyFlow: number;
  recoveryMonths: number | null;
  mostDemandingMonth: number;
  capitalPaid: number;
  exitValue: number;
  investmentResult: number;
  status: Status;
};

type Scenario = {
  exitValuePct?: number;
  costPct?: number;
  exitMonthDelta?: number;
  incomeChange?: number;
  expenseChange?: number;
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
  exitValue: 0,
  exitMonth: 12,
  paymentType: "Contado",
  financedAmount: 0,
  installments: 12,
  offeredInstallment: 0
};

const steps = [
  "Tipo",
  "Situación actual",
  "Decisión",
  "Financiación",
  "Resultados"
];

const decisionCards: Array<{
  type: DecisionType;
  title: string;
  examples: string;
  available: boolean;
}> = [
  {
    type: "Compra personal",
    title: "Compra personal",
    examples: "Auto, moto, mudanza, gastos grandes.",
    available: true
  },
  {
    type: "Inversión / oportunidad",
    title: "Inversión / oportunidad",
    examples: "Terreno, auto para reventa, capital inmovilizado, oportunidad de compra y venta.",
    available: true
  },
  {
    type: "Proyecto que puede generar ingresos",
    title: "Proyecto que puede generar ingresos",
    examples: "Emprendimiento, networking, curso, herramienta de trabajo, membresía.",
    available: false
  }
];

function money(value: number, currency: Currency) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0);
}

function clampMonth(value: number, max = 24) {
  return Math.min(max, Math.max(1, Math.round(value || 1)));
}

function statusLabel(finalCash: number, investmentResult: number, minCash: number, recoveryMonths: number | null): Status {
  if (finalCash < 0 || minCash < 0 || investmentResult < 0 || recoveryMonths === null) {
    return "Riesgo alto";
  }
  const lowCash = minCash < Math.max(1, Math.abs(finalCash) * 0.1);
  const slowRecovery = recoveryMonths > 12;
  if (lowCash || slowRecovery) {
    return "Ajustada";
  }
  return "Sostenible";
}

function statusClasses(status: Status) {
  if (status === "Sostenible") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "Ajustada") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-red-200 bg-red-50 text-red-800";
}

function buildProjection(inputs: Inputs, scenario: Scenario = {}, isInvestment = false): MonthRow[] {
  const rows: MonthRow[] = [];
  let cash = inputs.cash;
  const upfrontInvestment =
    inputs.paymentType === "Cuotas"
      ? Math.max(inputs.investment - inputs.financedAmount, 0)
      : inputs.investment;
  const adjustedExpense = Math.max(0, inputs.newExpense * (1 + (scenario.costPct ?? 0)) + (scenario.expenseChange ?? 0));
  const adjustedIncome = Math.max(0, inputs.newIncome + (scenario.incomeChange ?? 0));
  const adjustedExitValue = Math.max(0, inputs.exitValue * (1 + (scenario.exitValuePct ?? 0)));
  const exitMonth = clampMonth(inputs.exitMonth + (scenario.exitMonthDelta ?? 0), inputs.months);

  for (let month = 1; month <= inputs.months; month += 1) {
    const newIncome =
      month >= inputs.incomeStartMonth ? adjustedIncome : 0;
    const newExpenses =
      month >= (isInvestment ? 1 : inputs.expenseStartMonth) ? adjustedExpense : 0;
    const exitIncome = isInvestment && month === exitMonth ? adjustedExitValue : 0;
    const financingPayment =
      inputs.paymentType === "Cuotas" && month <= inputs.installments
        ? inputs.offeredInstallment
        : 0;
    const investmentImpact = month === 1 ? upfrontInvestment : 0;
    const totalIncome = inputs.income + newIncome + exitIncome;
    const totalExpenses =
      inputs.expenses + newExpenses + financingPayment + investmentImpact;
    const monthlyResult = totalIncome - totalExpenses;
    cash += monthlyResult;

    rows.push({
      month,
      currentIncome: inputs.income,
      newIncome,
      exitIncome,
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

function calculate(inputs: Inputs, scenario: Scenario = {}, isInvestment = false): Calculation {
  const rows = buildProjection(inputs, scenario, isInvestment);
  const finalCash = rows.at(-1)?.accumulatedCash ?? inputs.cash;
  const minRow = rows.reduce((lowest, row) => row.accumulatedCash < lowest.accumulatedCash ? row : lowest, rows[0]);
  const minCash = minRow?.accumulatedCash ?? inputs.cash;
  const mostDemandingMonth = minRow?.month ?? 1;
  const monthlyFlow =
    (inputs.newIncome + (scenario.incomeChange ?? 0)) -
    Math.max(0, inputs.newExpense * (1 + (scenario.costPct ?? 0)) + (scenario.expenseChange ?? 0)) -
    (inputs.paymentType === "Cuotas" ? inputs.offeredInstallment : 0);
  const adjustedExitValue = Math.max(0, inputs.exitValue * (1 + (scenario.exitValuePct ?? 0)));
  const generatedIncome = rows.reduce((acc, row) => acc + row.newIncome, 0);
  const carryingCosts = rows.reduce((acc, row) => acc + row.newExpenses, 0);
  const financingPaid = rows.reduce((acc, row) => acc + row.financingPayment, 0);
  const capitalPaid = rows.reduce((acc, row) => acc + row.upfrontInvestment, 0) + financingPaid;
  const investmentResult = isInvestment
    ? generatedIncome + adjustedExitValue - carryingCosts - capitalPaid
    : rows.reduce((acc, row) => acc + row.monthlyResult, 0);
  const recoveryMonths = investmentResult >= 0
    ? clampMonth(inputs.exitMonth + (scenario.exitMonthDelta ?? 0), inputs.months)
    : monthlyFlow > 0
      ? Math.ceil(inputs.investment / monthlyFlow)
      : null;
  const status = statusLabel(finalCash, investmentResult, minCash, recoveryMonths);

  return {
    rows,
    finalCash,
    totalResult: rows.reduce((acc, row) => acc + row.monthlyResult, 0),
    minCash,
    monthlyFlow,
    recoveryMonths,
    mostDemandingMonth,
    capitalPaid,
    exitValue: adjustedExitValue,
    investmentResult,
    status
  };
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
      <p className="mt-2 break-words text-xl font-semibold text-[#28322f]">{value}</p>
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
      <svg className="h-auto w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolución de caja acumulada">
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
  const [decisionType, setDecisionType] = useState<DecisionType | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [inputs, setInputs] = useState<Inputs>(initialInputs);
  const [customExitValuePct, setCustomExitValuePct] = useState(0);
  const [customCostPct, setCustomCostPct] = useState(0);
  const [customExitMonthDelta, setCustomExitMonthDelta] = useState(0);
  const [customIncome, setCustomIncome] = useState(0);
  const [customExpense, setCustomExpense] = useState(0);
  const isInvestment = decisionType === "Inversión / oportunidad";

  const results = useMemo(() => calculate(inputs, {}, isInvestment), [inputs, isInvestment]);
  const difficult = useMemo(
    () => calculate(inputs, isInvestment ? { exitValuePct: -0.2, costPct: 0.1, exitMonthDelta: inputs.exitMonth + 2 <= inputs.months ? 2 : 0 } : { incomeChange: inputs.newIncome * -0.2, expenseChange: inputs.newExpense * 0.1 }, isInvestment),
    [inputs, isInvestment]
  );
  const favorable = useMemo(
    () => calculate(inputs, isInvestment ? { exitValuePct: 0.2, costPct: -0.1, exitMonthDelta: inputs.exitMonth > 1 ? -1 : 0 } : { incomeChange: inputs.newIncome * 0.2, expenseChange: inputs.newExpense * -0.1 }, isInvestment),
    [inputs, isInvestment]
  );
  const custom = useMemo(
    () => calculate(inputs, isInvestment ? { exitValuePct: customExitValuePct / 100, costPct: customCostPct / 100, exitMonthDelta: customExitMonthDelta } : { incomeChange: customIncome, expenseChange: customExpense }, isInvestment),
    [inputs, isInvestment, customExitValuePct, customCostPct, customExitMonthDelta, customIncome, customExpense]
  );

  const totalFinanced = inputs.paymentType === "Cuotas" ? inputs.financedAmount : 0;
  const totalPaid =
    inputs.paymentType === "Cuotas" ? inputs.offeredInstallment * inputs.installments : 0;
  const financeCost = totalPaid - totalFinanced;
  const financeCostPct = totalFinanced > 0 ? financeCost / totalFinanced : 0;

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs((current) => ({ ...current, [key]: value }));
  }

  function chooseDecision(type: DecisionType, available: boolean) {
    setDecisionType(type);
    setShowComingSoon(!available);
    if (available) {
      setStep(1);
    }
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
              {isInvestment ? "Simulador de impacto de una inversión" : "Simulador de decisiones financieras"}
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
              className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                index === step
                  ? "border-[#2f6f63] bg-[#2f6f63] text-white"
                  : "border-[#d9d3c7] bg-[#fffdf8] text-[#6d766f]"
              }`}
              onClick={() => setStep(index)}
              type="button"
            >
              {index === 2 && isInvestment ? "Inversión" : item}
            </button>
          ))}
        </nav>

        <section className="rounded-xl border border-[#d9d3c7] bg-[#fffdf8] p-5 shadow-sm sm:p-6">
          {step === 0 ? (
            <div className="grid gap-6">
              <div className="max-w-3xl">
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#2f6f63]">
                  Simulador guiado
                </p>
                <h2 className="text-3xl font-semibold leading-tight text-[#28322f] sm:text-5xl">
                  ¿Qué querés analizar?
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#6d766f] sm:text-lg">
                  Un solo motor financiero, con textos y escenarios adaptados al tipo de decisión.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {decisionCards.map((card) => {
                  const selected = decisionType === card.type;
                  return (
                    <button
                      key={card.type}
                      className={`grid min-h-[190px] content-between rounded-lg border p-5 text-left transition hover:border-[#2f6f63] ${
                        selected ? "border-[#2f6f63] bg-[#eef7f3]" : "border-[#d9d3c7] bg-white"
                      }`}
                      onClick={() => chooseDecision(card.type, card.available)}
                      type="button"
                    >
                      <span>
                        <span className="block text-xl font-semibold text-[#28322f]">{card.title}</span>
                        <span className="mt-3 block text-sm leading-relaxed text-[#6d766f]">{card.examples}</span>
                      </span>
                      <span className={`mt-5 w-fit rounded-full border px-3 py-1 text-sm font-semibold ${card.available ? "border-[#2f6f63] text-[#2f6f63]" : "border-[#d9d3c7] text-[#6d766f]"}`}>
                        {card.available ? "Analizar" : "Próximamente"}
                      </span>
                    </button>
                  );
                })}
              </div>
              {showComingSoon ? (
                <div className="rounded-lg border border-[#d9d3c7] bg-white p-4 text-sm leading-relaxed text-[#6d766f]">
                  Esta capa narrativa todavía no está disponible. Podés avanzar con inversión / oportunidad o compra personal.
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#28322f]">Situación actual</h2>
                <p className="mt-2 text-sm text-[#6d766f]">
                  {isInvestment
                    ? "Esto nos permite ver si la inversión es sostenible para tu situación actual."
                    : "Cargá una foto simple de tu punto de partida."}
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
                <h2 className="text-2xl font-semibold text-[#28322f]">
                  {isInvestment ? "Inversión / oportunidad" : "Nueva decisión"}
                </h2>
                <p className="mt-2 text-sm text-[#6d766f]">
                  {isInvestment
                    ? "Cargá los flujos esperados de la oportunidad para ver su impacto en tu caja."
                    : "Separá lo que cambia por esta decisión de lo que ya pasa hoy."}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {isInvestment ? (
                  <>
                    <NumberField label="Capital inicial a invertir" value={inputs.investment} onChange={(value) => update("investment", value)} helper="Monto que necesitás poner al comienzo." />
                    <NumberField label="Costos mensuales de sostener la inversión" value={inputs.newExpense} onChange={(value) => update("newExpense", value)} helper="Expensas, mantenimiento, seguros, gastos administrativos u otros costos." />
                    <NumberField label="Ingreso mensual esperado" value={inputs.newIncome} onChange={(value) => update("newIncome", value)} helper="Completá solo si la inversión genera ingresos durante el período." />
                    <NumberField label="Mes desde el que empieza a generar ingresos" value={inputs.incomeStartMonth} min={1} onChange={(value) => update("incomeStartMonth", clampMonth(value, inputs.months))} />
                    <NumberField label="Valor estimado de venta o salida" value={inputs.exitValue} onChange={(value) => update("exitValue", value)} helper="Monto que estimás recibir si vendés o cerrás la inversión." />
                    <NumberField label="Mes estimado de venta o salida" value={inputs.exitMonth} min={1} onChange={(value) => update("exitMonth", clampMonth(value, inputs.months))} helper="Mes en el que esperás recuperar el capital o vender el activo." />
                  </>
                ) : (
                  <>
                    <NumberField label="Inversión inicial" value={inputs.investment} onChange={(value) => update("investment", value)} />
                    <NumberField label="Nuevo gasto mensual" value={inputs.newExpense} onChange={(value) => update("newExpense", value)} />
                    <NumberField label="Nuevos ingresos esperados" value={inputs.newIncome} onChange={(value) => update("newIncome", value)} />
                    <NumberField label="Mes desde el que impactan los nuevos ingresos" value={inputs.incomeStartMonth} min={1} onChange={(value) => update("incomeStartMonth", clampMonth(value, inputs.months))} />
                    <NumberField label="Mes desde el que impactan los nuevos gastos" value={inputs.expenseStartMonth} min={1} onChange={(value) => update("expenseStartMonth", clampMonth(value, inputs.months))} />
                  </>
                )}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#28322f]">Financiación</h2>
                <p className="mt-2 text-sm text-[#6d766f]">
                  {isInvestment
                    ? "No calculamos una tasa bancaria exacta. Estimamos el costo financiero aproximado para ayudarte a decidir."
                    : "Usá el monto de cuota que te ofrecen. No calculamos tasas bancarias."}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField<PaymentType> label="Forma de pago" value={inputs.paymentType} options={["Contado", "Cuotas"]} onChange={(value) => update("paymentType", value)} />
                <NumberField label="Monto financiado" value={inputs.financedAmount} onChange={(value) => update("financedAmount", value)} />
                <NumberField label="Cantidad de cuotas" value={inputs.installments} min={1} onChange={(value) => update("installments", clampMonth(value, inputs.months))} />
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
                  {isInvestment
                    ? "Esta simulación no recomienda inversiones. Solo muestra el impacto estimado en tu caja según los datos cargados."
                    : "Mirá por separado si la decisión recupera lo invertido y si podés sostenerla."}
                </p>
              </div>

              <section className="grid gap-4 lg:grid-cols-3">
                <MetricCard label={isInvestment ? "Capital invertido" : "Inversión analizada"} value={money(inputs.investment, inputs.currency)} helper={isInvestment ? "Capital inicial cargado para la oportunidad." : "Monto inicial que necesitás recuperar."} />
                <MetricCard label={isInvestment ? "Flujo mensual de la inversión" : "Flujo mensual nuevo"} value={money(results.monthlyFlow, inputs.currency)} helper={isInvestment ? "Ingreso esperado menos costos mensuales y cuota, si corresponde." : "Resultado mensual generado únicamente por esta nueva decisión."} tone={results.monthlyFlow >= 0 ? "success" : "danger"} />
                <MetricCard label="Recupero estimado" value={results.recoveryMonths ? `Mes ${results.recoveryMonths}` : "No recupera"} helper={isInvestment ? "Mes estimado de recupero o salida cargado en la simulación." : "Tiempo estimado en el que la nueva decisión recuperaría lo invertido."} tone={results.recoveryMonths ? "success" : "danger"} />
              </section>

              {isInvestment ? (
                <section className="grid gap-4">
                  <h3 className="text-xl font-semibold text-[#28322f]">Resultado de la inversión</h3>
                  <div className="grid gap-4 lg:grid-cols-4">
                    <MetricCard label="Capital invertido" value={money(results.capitalPaid, inputs.currency)} />
                    <MetricCard label="Valor estimado de salida" value={money(results.exitValue, inputs.currency)} />
                    <MetricCard label="Resultado estimado" value={money(results.investmentResult, inputs.currency)} tone={results.investmentResult >= 0 ? "success" : "danger"} />
                    <MetricCard label="Recupero estimado" value={results.recoveryMonths ? `Mes ${results.recoveryMonths}` : "No recupera"} />
                  </div>
                </section>
              ) : null}

              <section className="grid gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-[#28322f]">
                    {isInvestment ? "Impacto en tu situación actual" : "Impacto en tu caja"}
                  </h3>
                  {isInvestment ? (
                    <p className="mt-1 text-sm text-[#6d766f]">
                      ¿Podés sostener esta inversión sin comprometer tu estabilidad financiera?
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-4 lg:grid-cols-4">
                  <MetricCard label="Caja final" value={money(results.finalCash, inputs.currency)} />
                  <MetricCard label={isInvestment ? "Mes más exigente" : "Resultado total"} value={isInvestment ? `Mes ${results.mostDemandingMonth}` : money(results.totalResult, inputs.currency)} />
                  <MetricCard label="Caja mínima" value={money(results.minCash, inputs.currency)} />
                  <MetricCard label="Estado" value={results.status} tone={results.status === "Sostenible" ? "success" : results.status === "Ajustada" ? "warning" : "danger"} helper={isInvestment ? "Situación actual + inversión." : "Situación actual + nueva decisión."} />
                </div>
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
                      detail: isInvestment ? "Salida -20%, costos +10% y demora posible de 2 meses." : "Ingresos -20% y gastos +10%.",
                      result: difficult
                    },
                    {
                      name: "Favorable",
                      detail: isInvestment ? "Salida +20%, costos -10% y salida posible 1 mes antes." : "Ingresos +20% y gastos -10%.",
                      result: favorable
                    }
                  ].map((scenario) => (
                    <div key={scenario.name} className="rounded-lg border border-[#d9d3c7] bg-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-[#28322f]">{scenario.name}</h4>
                          <p className="mt-1 text-xs leading-relaxed text-[#6d766f]">{scenario.detail}</p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${statusClasses(scenario.result.status)}`}>
                          {scenario.result.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <span>Caja final</span><strong>{money(scenario.result.finalCash, inputs.currency)}</strong>
                        <span>Resultado estimado</span><strong>{money(isInvestment ? scenario.result.investmentResult : scenario.result.totalResult, inputs.currency)}</strong>
                        <span>Caja mínima</span><strong>{money(scenario.result.minCash, inputs.currency)}</strong>
                        <span>Estado</span><strong>{scenario.result.status}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 rounded-lg border border-[#d9d3c7] bg-white p-4">
                <h3 className="text-xl font-semibold text-[#28322f]">Armá tu propio escenario</h3>
                {isInvestment ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    <NumberField label="Cambio valor de salida (%)" value={customExitValuePct} min={-100} onChange={setCustomExitValuePct} />
                    <NumberField label="Cambio costos mensuales (%)" value={customCostPct} min={-100} onChange={setCustomCostPct} />
                    <NumberField label="Cambio mes de salida" value={customExitMonthDelta} min={-24} onChange={(value) => setCustomExitMonthDelta(Math.round(value || 0))} />
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <NumberField label="Cambio ingresos" value={customIncome} min={-999999999} onChange={setCustomIncome} />
                    <NumberField label="Cambio gastos" value={customExpense} min={-999999999} onChange={setCustomExpense} />
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-4">
                  <MetricCard label="Caja final" value={money(custom.finalCash, inputs.currency)} />
                  <MetricCard label="Resultado estimado" value={money(isInvestment ? custom.investmentResult : custom.totalResult, inputs.currency)} />
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
