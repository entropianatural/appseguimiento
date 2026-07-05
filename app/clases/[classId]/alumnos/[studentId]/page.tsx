import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentAnalyticsCharts } from "@/components/student-analytics-charts";
import { AppLogoLink } from "@/components/app-logo-link";
import { updateStudentAvatarAction } from "@/app/alumnos/actions";
import {
  getStudentAvatarOptions,
  getStudentAvatarSeed,
  getStudentAvatarUrl,
} from "@/lib/avatar";
import { createClient } from "@/lib/supabase/server";

type StudentDetailPageProps = {
  params: Promise<{
    classId: string;
    studentId: string;
  }>;
  searchParams: Promise<{
    period?: string;
    success?: string;
    error?: string;
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

function formatRecordDateTime(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getInitials(firstName: string, lastName: string) {
  const first = firstName.trim().charAt(0).toUpperCase();
  const last = lastName.trim().charAt(0).toUpperCase();

  return `${first}${last}`;
}

function getSuccessMessage(success?: string) {
  if (success === "avatar-updated") {
    return "El avatar del alumno se ha actualizado correctamente.";
  }

  return null;
}

function getErrorMessage(error?: string) {
  if (error === "avatar-update-failed") {
    return "No se ha podido actualizar el avatar del alumno.";
  }

  return null;
}

export default async function StudentDetailPage({
  params,
  searchParams,
}: StudentDetailPageProps) {
  const { classId, studentId } = await params;
    const currentSearchParams = await searchParams;
    const selectedPeriod = getPeriodOption(currentSearchParams.period);
    const successMessage = getSuccessMessage(currentSearchParams.success);
    const errorMessage = getErrorMessage(currentSearchParams.error);

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

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select(
      "id, first_name, last_name, list_number, external_id, avatar_key, created_at",
    )
    .eq("id", studentId)
    .eq("class_id", classId)
    .eq("teacher_id", userId)
    .single();

  if (studentError || !student) {
    redirect(`/clases/${classId}`);
  }

  const currentAvatarSeed = getStudentAvatarSeed(student);
  const avatarOptions = getStudentAvatarOptions(student.id, 8);

  const startDate = getStartDateFromPeriod(selectedPeriod);

  let recordsQuery = supabase
    .from("behavior_records")
    .select(
      `
      id,
      skill_id,
      record_date,
      recorded_at,
      type,
      value,
      note,
      skills (
        id,
        name,
        default_type
      )
    `,
    )
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .eq("teacher_id", userId)
    .order("record_date", { ascending: true })
    .order("recorded_at", { ascending: false });

  if (startDate) {
    recordsQuery = recordsQuery.gte("record_date", startDate);
  }

  const { data: records, error: recordsError } = await recordsQuery;

  if (recordsError) {
    console.error("Error loading student records:", recordsError);
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

  const dailyStatsByDate = new Map<
    string,
    {
      date: string;
      positive: number;
      negative: number;
      balance: number;
    }
  >();

  const positiveSkillFrequencyById = new Map<
    string,
    {
      id: string;
      name: string;
      total: number;
    }
  >();

  const negativeSkillFrequencyById = new Map<
    string,
    {
      id: string;
      name: string;
      total: number;
    }
  >();

  for (const record of safeRecords) {
    const skill = Array.isArray(record.skills)
      ? record.skills[0]
      : record.skills;

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
      if (record.type === "positive") {
        const currentSkillStats =
          positiveSkillFrequencyById.get(record.skill_id ?? "") ?? {
            id: record.skill_id ?? "",
            name: skill.name,
            total: 0,
          };

        currentSkillStats.total += 1;
        positiveSkillFrequencyById.set(
          record.skill_id ?? "",
          currentSkillStats,
        );
      } else {
        const currentSkillStats =
          negativeSkillFrequencyById.get(record.skill_id ?? "") ?? {
            id: record.skill_id ?? "",
            name: skill.name,
            total: 0,
          };

        currentSkillStats.total += 1;
        negativeSkillFrequencyById.set(
          record.skill_id ?? "",
          currentSkillStats,
        );
      }
    }
  }

  const dailyEvolution = Array.from(dailyStatsByDate.values()).map((item) => ({
    date: formatDisplayDate(item.date),
    positive: item.positive,
    negative: item.negative,
    balance: item.balance,
  }));

  const positiveSkillFrequency = Array.from(
    positiveSkillFrequencyById.values(),
  )
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)
    .map((item) => ({
      name: item.name,
      total: item.total,
    }));

  const negativeSkillFrequency = Array.from(
    negativeSkillFrequencyById.values(),
  )
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)
    .map((item) => ({
      name: item.name,
      total: item.total,
    }));

  const mainStrength = positiveSkillFrequency[0] ?? null;
  const mainImprovement = negativeSkillFrequency[0] ?? null;

  const recentRecords = [...safeRecords]
    .sort(
      (a, b) =>
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
    )
    .slice(0, 20);

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

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/clases/${classId}/panel`}
              className="text-sm font-semibold text-blue-700"
            >
              Panel diario →
            </Link>

            <Link
              href={`/clases/${classId}/analitica`}
              className="text-sm font-semibold text-blue-700"
            >
              Analítica de clase →
            </Link>
          </div>
        </div>

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <img
                src={getStudentAvatarUrl(student)}
                alt={`Avatar de ${student.first_name} ${student.last_name}`}
                className="h-16 w-16 shrink-0 rounded-2xl bg-blue-50 object-cover ring-1 ring-blue-100"
                />

              <div>
                <p className="text-sm font-medium text-blue-700">
                  Ficha de alumno
                </p>
                <h1 className="mt-1 text-3xl font-bold">
                  {student.first_name} {student.last_name}
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  {classGroup.name} · Nº lista:{" "}
                  {student.list_number ?? "sin asignar"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {PERIOD_OPTIONS.map((option) => (
              <Link
                key={option.value}
                href={`/clases/${classId}/alumnos/${studentId}?period=${option.value}`}
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

        {errorMessage ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
            </div>
            ) : null}

            {successMessage ? (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {successMessage}
            </div>
            ) : null}

            <details className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <summary className="flex cursor-pointer list-none flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                <img
                    src={getStudentAvatarUrl(student)}
                    alt={`Avatar actual de ${student.first_name} ${student.last_name}`}
                    className="h-14 w-14 shrink-0 rounded-2xl bg-blue-50 object-cover ring-1 ring-blue-100"
                />

                <div>
                    <h2 className="text-xl font-semibold">Avatar del alumno</h2>
                    <p className="mt-1 text-sm text-slate-600">
                    Pulsa para cambiar el avatar personalizado.
                    </p>
                </div>
                </div>

                <span className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                Cambiar avatar
                </span>
            </summary>

            <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h3 className="font-semibold text-slate-900">
                    Elige una opción
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                    Selecciona un avatar Miniavs para personalizar visualmente a este alumno.
                    </p>
                </div>

                <span className="text-sm text-slate-500">
                    8 opciones disponibles
                </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
                {avatarOptions.map((option) => {
                    const isSelected = option.key === currentAvatarSeed;

                    return (
                    <form
                        key={option.key}
                        action={updateStudentAvatarAction}
                        className={
                        isSelected
                            ? "rounded-2xl border-2 border-blue-500 bg-blue-50 p-3 shadow-sm"
                            : "rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-blue-300 hover:bg-white"
                        }
                    >
                        <input type="hidden" name="classId" value={classId} />
                        <input type="hidden" name="studentId" value={studentId} />
                        <input type="hidden" name="avatarKey" value={option.key} />

                        <img
                        src={option.url}
                        alt={`Opción de avatar ${option.key}`}
                        className="mx-auto h-20 w-20 rounded-2xl bg-white object-cover ring-1 ring-slate-200"
                        />

                        <button
                        type="submit"
                        disabled={isSelected}
                        className={
                            isSelected
                            ? "mt-3 w-full rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                            : "mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        }
                        >
                        {isSelected ? "Avatar actual" : "Usar este"}
                        </button>
                    </form>
                    );
                })}
                </div>
            </div>
            </details>

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

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Lectura individual</h2>

          {totalRecords === 0 ? (
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Todavía no hay registros para este alumno en el periodo
              seleccionado.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 text-sm leading-6 text-slate-600 lg:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p>
                  En este periodo tiene <strong>{totalRecords}</strong>{" "}
                  registros, con un balance de{" "}
                  <strong>
                    {totalBalance > 0 ? "+" : ""}
                    {totalBalance}
                  </strong>{" "}
                  puntos.
                </p>
              </div>

              <div className="rounded-2xl bg-green-50 p-4 text-green-900">
                {mainStrength ? (
                  <p>
                    Fortaleza principal:{" "}
                    <strong>{mainStrength.name}</strong>, con{" "}
                    <strong>{mainStrength.total}</strong> registros.
                  </p>
                ) : (
                  <p>No hay fortalezas registradas en este periodo.</p>
                )}
              </div>

              <div className="rounded-2xl bg-red-50 p-4 text-red-900">
                {mainImprovement ? (
                  <p>
                    Aspecto de mejora principal:{" "}
                    <strong>{mainImprovement.name}</strong>, con{" "}
                    <strong>{mainImprovement.total}</strong> registros.
                  </p>
                ) : (
                  <p>No hay aspectos de mejora registrados en este periodo.</p>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="mt-6">
          <StudentAnalyticsCharts
            dailyEvolution={dailyEvolution}
            positiveSkillFrequency={positiveSkillFrequency}
            negativeSkillFrequency={negativeSkillFrequency}
          />
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Histórico reciente</h2>
              <p className="mt-2 text-sm text-slate-600">
                Últimos registros del alumno en el periodo seleccionado.
              </p>
            </div>

            <span className="text-sm text-slate-500">
              {recentRecords.length} mostrados
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {recentRecords.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No hay registros recientes.
                </p>
              </div>
            ) : (
              recentRecords.map((record) => {
                const skill = Array.isArray(record.skills)
                  ? record.skills[0]
                  : record.skills;

                return (
                  <article
                    key={record.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={
                              record.type === "positive"
                                ? "rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700"
                                : "rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700"
                            }
                          >
                            {record.value > 0 ? "+" : ""}
                            {record.value}
                          </span>

                          <h3 className="font-semibold text-slate-900">
                            {skill?.name ?? "Sin destreza"}
                          </h3>
                        </div>

                        {record.note ? (
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {record.note}
                          </p>
                        ) : null}
                      </div>

                      <p className="text-sm text-slate-500">
                        {formatRecordDateTime(record.recorded_at)}
                      </p>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}