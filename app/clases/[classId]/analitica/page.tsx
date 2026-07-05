import Link from "next/link";
import { redirect } from "next/navigation";
import { ClassAnalyticsCharts } from "@/components/class-analytics-charts";
import { AppLogoLink } from "@/components/app-logo-link";
import { createClient } from "@/lib/supabase/server";

type AnalyticsPageProps = {
  params: Promise<{
    classId: string;
  }>;
  searchParams: Promise<{
    period?: string;
  }>;
};

type PeriodOption = {
  label: string;
  value: string;
  days: number | null;
};

const PERIOD_OPTIONS: PeriodOption[] = [
  {
    label: "Últimos 7 días",
    value: "7",
    days: 7,
  },
  {
    label: "Últimos 30 días",
    value: "30",
    days: 30,
  },
  {
    label: "Últimos 90 días",
    value: "90",
    days: 90,
  },
  {
    label: "Todo",
    value: "all",
    days: null,
  },
];

function getMadridDateString(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function getStartDateFromPeriod(period: PeriodOption) {
  if (period.days === null) {
    return null;
  }

  const date = new Date();
  date.setDate(date.getDate() - period.days + 1);

  return getMadridDateString(date);
}

function getPeriodOption(value?: string) {
  return (
    PERIOD_OPTIONS.find((option) => option.value === value) ??
    PERIOD_OPTIONS[1]
  );
}

function formatDisplayDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}`;
}

export default async function ClassAnalyticsPage({
  params,
  searchParams,
}: AnalyticsPageProps) {
  const { classId } = await params;
  const currentSearchParams = await searchParams;
  const selectedPeriod = getPeriodOption(currentSearchParams.period);

  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  const claims = data?.claims;

  if (error || !claims) {
    redirect("/login");
  }

  const userId = claims.sub;

  const { data: classGroup, error: classError } = await supabase
    .from("classes")
    .select("id, name, academic_year")
    .eq("id", classId)
    .eq("teacher_id", userId)
    .is("archived_at", null)
    .single();

  if (classError || !classGroup) {
    redirect("/panel");
  }

  const startDate = getStartDateFromPeriod(selectedPeriod);

  let recordsQuery = supabase
    .from("behavior_records")
    .select(
      `
      id,
      student_id,
      skill_id,
      record_date,
      type,
      value,
      students (
        id,
        first_name,
        last_name,
        list_number
      ),
      skills (
        id,
        name,
        default_type
      )
    `,
    )
    .eq("class_id", classId)
    .eq("teacher_id", userId)
    .order("record_date", { ascending: true });

  if (startDate) {
    recordsQuery = recordsQuery.gte("record_date", startDate);
  }

  const { data: records, error: recordsError } = await recordsQuery;

  if (recordsError) {
    console.error("Error loading analytics records:", recordsError);
  }

  const safeRecords = records ?? [];

  const totalPositive = safeRecords.filter(
    (record) => record.type === "positive",
  ).length;

  const totalNegative = safeRecords.filter(
    (record) => record.type === "negative",
  ).length;

  const totalBalance = safeRecords.reduce(
    (sum, record) => sum + record.value,
    0,
  );

  const totalRecords = safeRecords.length;

  const studentStatsById = new Map<
    string,
    {
      id: string;
      name: string;
      listNumber: number | null;
      positive: number;
      negative: number;
      balance: number;
      total: number;
    }
  >();

  const dailyStatsByDate = new Map<
    string,
    {
      date: string;
      positive: number;
      negative: number;
      balance: number;
    }
  >();

  const skillFrequencyById = new Map<
    string,
    {
      id: string;
      name: string;
      total: number;
      positive: number;
      negative: number;
    }
  >();

  for (const record of safeRecords) {
    const student = Array.isArray(record.students)
      ? record.students[0]
      : record.students;

    const skill = Array.isArray(record.skills)
      ? record.skills[0]
      : record.skills;

    if (student) {
      const studentName = `${student.first_name} ${student.last_name}`;

      const currentStudentStats =
        studentStatsById.get(record.student_id) ?? {
          id: record.student_id,
          name: studentName,
          listNumber: student.list_number,
          positive: 0,
          negative: 0,
          balance: 0,
          total: 0,
        };

      if (record.type === "positive") {
        currentStudentStats.positive += 1;
      } else {
        currentStudentStats.negative += 1;
      }

      currentStudentStats.balance += record.value;
      currentStudentStats.total += 1;

      studentStatsById.set(record.student_id, currentStudentStats);
    }

    const currentDailyStats =
      dailyStatsByDate.get(record.record_date) ?? {
        date: record.record_date,
        positive: 0,
        negative: 0,
        balance: 0,
      };

    if (record.type === "positive") {
      currentDailyStats.positive += 1;
    } else {
      currentDailyStats.negative += 1;
    }

    currentDailyStats.balance += record.value;

    dailyStatsByDate.set(record.record_date, currentDailyStats);

    if (skill) {
      const currentSkillStats =
        skillFrequencyById.get(record.skill_id ?? "") ?? {
          id: record.skill_id ?? "",
          name: skill.name,
          total: 0,
          positive: 0,
          negative: 0,
        };

      currentSkillStats.total += 1;

      if (record.type === "positive") {
        currentSkillStats.positive += 1;
      } else {
        currentSkillStats.negative += 1;
      }

      skillFrequencyById.set(record.skill_id ?? "", currentSkillStats);
    }
  }

  const ranking = Array.from(studentStatsById.values()).sort((a, b) => {
    if (b.balance !== a.balance) {
      return b.balance - a.balance;
    }

    return b.total - a.total;
  });

  const skillFrequency = Array.from(skillFrequencyById.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map((item) => ({
      name: item.name,
      total: item.total,
    }));

  const dailyEvolution = Array.from(dailyStatsByDate.values()).map((item) => ({
    date: formatDisplayDate(item.date),
    positive: item.positive,
    negative: item.negative,
    balance: item.balance,
  }));

  const mostFrequentSkill =
    Array.from(skillFrequencyById.values()).sort((a, b) => b.total - a.total)[0] ??
    null;

  const bestStudent = ranking[0] ?? null;

  const studentsWithNegativeBalance = ranking.filter(
    (student) => student.balance < 0,
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
            <AppLogoLink compact />
        </div>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={`/clases/${classId}`}
            className="text-sm font-semibold text-blue-700"
          >
            ← Volver a la clase
          </Link>

          <Link
            href={`/clases/${classId}/panel`}
            className="text-sm font-semibold text-blue-700"
          >
            Ir al panel diario →
          </Link>
        </div>

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-blue-700">Analítica</p>
          <h1 className="mt-1 text-3xl font-bold">{classGroup.name}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Resumen de registros positivos, negativos, balance de puntos,
            ranking de alumnado y destrezas más frecuentes.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {PERIOD_OPTIONS.map((option) => (
              <Link
                key={option.value}
                href={`/clases/${classId}/analitica?period=${option.value}`}
                className={
                  option.value === selectedPeriod.value
                    ? "rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                    : "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                }
              >
                {option.label}
              </Link>
            ))}
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Registros</p>
            <p className="mt-2 text-3xl font-bold">{totalRecords}</p>
          </div>

          <div className="rounded-2xl border border-green-100 bg-green-50 p-6 shadow-sm">
            <p className="text-sm text-green-700">Positivos</p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {totalPositive}
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 shadow-sm">
            <p className="text-sm text-red-700">Negativos</p>
            <p className="mt-2 text-3xl font-bold text-red-700">
              {totalNegative}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 shadow-sm">
            <p className="text-sm text-blue-700">Balance</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">
              {totalBalance > 0 ? "+" : ""}
              {totalBalance}
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Lectura rápida</h2>

            {totalRecords === 0 ? (
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Todavía no hay registros en el periodo seleccionado.
              </p>
            ) : (
              <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
                <p>
                  El periodo seleccionado tiene{" "}
                  <strong>{totalRecords}</strong> registros, con un balance de{" "}
                  <strong>
                    {totalBalance > 0 ? "+" : ""}
                    {totalBalance}
                  </strong>{" "}
                  puntos.
                </p>

                {bestStudent ? (
                  <p>
                    El alumno con mejor balance es{" "}
                    <strong>{bestStudent.name}</strong>, con{" "}
                    <strong>
                      {bestStudent.balance > 0 ? "+" : ""}
                      {bestStudent.balance}
                    </strong>{" "}
                    puntos.
                  </p>
                ) : null}

                {mostFrequentSkill ? (
                  <p>
                    La destreza o conducta más frecuente es{" "}
                    <strong>{mostFrequentSkill.name}</strong>, con{" "}
                    <strong>{mostFrequentSkill.total}</strong> registros.
                  </p>
                ) : null}

                {studentsWithNegativeBalance > 0 ? (
                  <p>
                    Hay <strong>{studentsWithNegativeBalance}</strong> alumnos
                    con balance negativo en este periodo.
                  </p>
                ) : (
                  <p>
                    No hay alumnos con balance negativo en este periodo.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Ranking de alumnado</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Ordenado por balance de puntos.
                </p>
              </div>

              <span className="text-sm text-slate-500">
                {ranking.length} alumnos con registros
              </span>
            </div>

            <div className="mt-6 overflow-x-auto">
              {ranking.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    Todavía no hay registros para crear ranking.
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-left text-slate-600">
                      <th className="px-3 py-3 font-semibold">#</th>
                      <th className="px-3 py-3 font-semibold">Alumno</th>
                      <th className="px-3 py-3 font-semibold">+</th>
                      <th className="px-3 py-3 font-semibold">-</th>
                      <th className="px-3 py-3 font-semibold">Balance</th>
                      <th className="px-3 py-3 font-semibold">Total</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {ranking.map((student, index) => (
                      <tr key={student.id}>
                        <td className="px-3 py-3 text-slate-500">
                          {index + 1}
                        </td>
                        <td className="px-3 py-3 font-medium text-slate-900">
                          {student.name}
                        </td>
                        <td className="px-3 py-3 text-green-700">
                          {student.positive}
                        </td>
                        <td className="px-3 py-3 text-red-700">
                          {student.negative}
                        </td>
                        <td className="px-3 py-3 font-bold">
                          {student.balance > 0 ? "+" : ""}
                          {student.balance}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {student.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <ClassAnalyticsCharts
            dailyEvolution={dailyEvolution}
            skillFrequency={skillFrequency}
          />
        </section>
      </div>
    </main>
  );
}