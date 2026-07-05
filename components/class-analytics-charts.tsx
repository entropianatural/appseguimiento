"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DailyEvolutionItem = {
  date: string;
  positive: number;
  negative: number;
  balance: number;
};

type SkillFrequencyItem = {
  name: string;
  total: number;
};

type ClassAnalyticsChartsProps = {
  dailyEvolution: DailyEvolutionItem[];
  skillFrequency: SkillFrequencyItem[];
};

export function ClassAnalyticsCharts({
  dailyEvolution,
  skillFrequency,
}: ClassAnalyticsChartsProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Evolución diaria
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Balance total de puntos por día.
          </p>
        </div>

        <div className="mt-6 h-80">
          {dailyEvolution.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
              No hay datos para mostrar.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyEvolution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="Balance"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Positivos y negativos
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Número de registros positivos y negativos por día.
          </p>
        </div>

        <div className="mt-6 h-80">
          {dailyEvolution.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
              No hay datos para mostrar.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyEvolution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="positive" name="Positivos" />
                <Bar dataKey="negative" name="Negativos" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Destrezas más frecuentes
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Destrezas o conductas más registradas en el periodo seleccionado.
          </p>
        </div>

        <div className="mt-6 h-96">
          {skillFrequency.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
              No hay datos para mostrar.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillFrequency} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={180}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="total" name="Registros" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}