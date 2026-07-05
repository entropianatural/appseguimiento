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

type StudentAnalyticsChartsProps = {
  dailyEvolution: DailyEvolutionItem[];
  positiveSkillFrequency: SkillFrequencyItem[];
  negativeSkillFrequency: SkillFrequencyItem[];
};

export function StudentAnalyticsCharts({
  dailyEvolution,
  positiveSkillFrequency,
  negativeSkillFrequency,
}: StudentAnalyticsChartsProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Evolución diaria
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Balance de puntos del alumno por día.
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

      <section className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Fortalezas más frecuentes
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Destrezas positivas más registradas.
          </p>
        </div>

        <div className="mt-6 h-80">
          {positiveSkillFrequency.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
              No hay fortalezas registradas.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={positiveSkillFrequency} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={160}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="total" name="Registros" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Aspectos de mejora
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Conductas negativas más registradas.
          </p>
        </div>

        <div className="mt-6 h-80">
          {negativeSkillFrequency.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
              No hay aspectos de mejora registrados.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={negativeSkillFrequency} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={160}
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