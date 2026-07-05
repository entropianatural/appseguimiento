import Link from "next/link";
import { redirect } from "next/navigation";
import { updateSoundEnabledAction } from "@/app/registros/actions";
import { DailyPanelStudentList } from "@/components/daily-panel-student-list";
import { AppLogoLink } from "@/components/app-logo-link";
import { createClient } from "@/lib/supabase/server";


type DailyPanelPageProps = {
  params: Promise<{
    classId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

function getMadridDateString() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

function getReadableMadridDate() {
  const formatter = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return formatter.format(new Date());
}

function getErrorMessage(error?: string) {
  if (error === "missing-record-data") {
    return "Faltan datos para guardar el registro.";
  }

  if (error === "invalid-record-type") {
    return "El tipo de registro no es válido.";
  }

  if (error === "note-too-long") {
    return "La observación no puede superar los 500 caracteres.";
  }

  if (error === "student-not-found") {
    return "No se ha encontrado el alumno en esta clase.";
  }

  if (error === "skill-not-found") {
    return "No se ha encontrado la destreza seleccionada.";
  }

  if (error === "skill-type-mismatch") {
    return "La destreza seleccionada no coincide con el tipo de registro.";
  }

  if (error === "record-create-failed") {
    return "No se ha podido guardar el registro.";
  }

  if (error === "sound-update-failed") {
    return "No se ha podido actualizar la preferencia de sonidos.";
  }

  return null;
}

function getSuccessMessage(success?: string) {
  if (success === "record-created") {
    return "Registro guardado correctamente.";
  }

  return null;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function DailyPanelPage({
  params,
  searchParams,
}: DailyPanelPageProps) {
  const { classId } = await params;
  const currentSearchParams = await searchParams;

  const errorMessage = getErrorMessage(currentSearchParams.error);
  const successMessage = getSuccessMessage(currentSearchParams.success);

  const today = getMadridDateString();

  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  const claims = data?.claims;

  if (error || !claims) {
    redirect("/login");
  }

  const userId = claims.sub;

  const { data: profile } = await supabase
  .from("profiles")
  .select("sound_enabled")
  .eq("id", userId)
  .single();

  const { data: classGroup, error: classError } = await supabase
    .from("classes")
    .select("id, name, academic_year, description")
    .eq("id", classId)
    .eq("teacher_id", userId)
    .is("archived_at", null)
    .single();

  if (classError || !classGroup) {
    redirect("/panel");
  }

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, first_name, last_name, list_number, avatar_key")
    .eq("class_id", classId)
    .eq("teacher_id", userId)
    .is("archived_at", null)
    .order("list_number", { ascending: true, nullsFirst: false })
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (studentsError) {
    console.error("Error loading students:", studentsError);
  }

  const { data: skills, error: skillsError } = await supabase
    .from("skills")
    .select("id, name, default_type, default_value")
    .eq("teacher_id", userId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (skillsError) {
    console.error("Error loading skills:", skillsError);
  }

  const { data: todayRecords, error: recordsError } = await supabase
    .from("behavior_records")
    .select("id, student_id, skill_id, type, value, note, recorded_at")
    .eq("class_id", classId)
    .eq("teacher_id", userId)
    .eq("record_date", today)
    .order("recorded_at", { ascending: false });

  if (recordsError) {
    console.error("Error loading records:", recordsError);
  }

  const positiveSkills = (skills ?? []).filter(
    (skill) => skill.default_type === "positive",
  );

  const negativeSkills = (skills ?? []).filter(
    (skill) => skill.default_type === "negative",
  );

  const studentNameById = new Map(
    (students ?? []).map((student) => [
      student.id,
      `${student.first_name} ${student.last_name}`,
    ]),
  );

  const skillNameById = new Map(
    (skills ?? []).map((skill) => [skill.id, skill.name]),
  );


const dailyScoreByStudentId = new Map<string, number>();
const dailyNegativeCountByStudentId = new Map<string, number>();

for (const record of todayRecords ?? []) {
  const currentScore = dailyScoreByStudentId.get(record.student_id) ?? 0;
  dailyScoreByStudentId.set(record.student_id, currentScore + record.value);

  if (record.type === "negative") {
    const currentNegativeCount =
      dailyNegativeCountByStudentId.get(record.student_id) ?? 0;

    dailyNegativeCountByStudentId.set(
      record.student_id,
      currentNegativeCount + 1,
    );
  }
}

const dailyScores = Object.fromEntries(dailyScoreByStudentId);
const dailyNegativeCounts = Object.fromEntries(dailyNegativeCountByStudentId);

  const totalPositive = (todayRecords ?? []).filter(
    (record) => record.type === "positive",
  ).length;

  const totalNegative = (todayRecords ?? []).filter(
    (record) => record.type === "negative",
  ).length;

  const totalBalance = (todayRecords ?? []).reduce(
    (sum, record) => sum + record.value,
    0,
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
                <AppLogoLink compact />

                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-blue-700">
                    Panel diario · {classGroup.name}
                    </p>
                    <p className="text-xs text-slate-500">{getReadableMadridDate()}</p>
                </div>
                </div>

            <div className="grid grid-cols-4 gap-2 text-center sm:flex sm:items-center">
            <div className="rounded-xl bg-green-50 px-3 py-2">
                <p className="text-[11px] font-medium text-green-700">+</p>
                <p className="text-sm font-bold text-green-700">{totalPositive}</p>
            </div>

            <div className="rounded-xl bg-red-50 px-3 py-2">
                <p className="text-[11px] font-medium text-red-700">-</p>
                <p className="text-sm font-bold text-red-700">{totalNegative}</p>
            </div>

            <div className="rounded-xl bg-blue-50 px-3 py-2">
                <p className="text-[11px] font-medium text-blue-700">Balance</p>
                <p className="text-sm font-bold text-blue-700">
                {totalBalance > 0 ? "+" : ""}
                {totalBalance}
                </p>
            </div>

            <form action={updateSoundEnabledAction}>
                <input type="hidden" name="classId" value={classId} />
                <input
                type="hidden"
                name="soundEnabled"
                value={profile?.sound_enabled ? "false" : "true"}
                />

                <button
                type="submit"
                className={
                    profile?.sound_enabled
                    ? "h-full w-full rounded-xl bg-green-100 px-3 py-2 text-xs font-bold text-green-700"
                    : "h-full w-full rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600"
                }
                title={
                    profile?.sound_enabled
                    ? "Sonidos activados"
                    : "Sonidos desactivados"
                }
                >
                {profile?.sound_enabled ? "🔊" : "🔇"}
                </button>
            </form>
            </div>
        </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={`/clases/${classId}`}
            className="text-sm font-semibold text-blue-700"
          >
            ← Volver a la clase
          </Link>

          <Link
            href="/destrezas"
            className="text-sm font-semibold text-blue-700"
          >
            Configurar destrezas →
          </Link>
        </div>

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-blue-700">Panel diario</p>
          <h1 className="mt-1 text-3xl font-bold">{classGroup.name}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {getReadableMadridDate()}. Cada alumno empieza visualmente con 0
            puntos cada día, pero el histórico queda guardado.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Alumnos activos</p>
              <p className="mt-1 text-2xl font-bold">
                {students?.length ?? 0}
              </p>
            </div>

            <div className="rounded-2xl bg-green-50 p-4">
              <p className="text-sm text-green-700">Positivos hoy</p>
              <p className="mt-1 text-2xl font-bold text-green-700">
                {totalPositive}
              </p>
            </div>

            <div className="rounded-2xl bg-red-50 p-4">
              <p className="text-sm text-red-700">Negativos hoy</p>
              <p className="mt-1 text-2xl font-bold text-red-700">
                {totalNegative}
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-sm text-blue-700">Balance del día</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">
                {totalBalance > 0 ? "+" : ""}
                {totalBalance}
              </p>
            </div>
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

        {(positiveSkills.length === 0 || negativeSkills.length === 0) ? (
          <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm leading-6 text-yellow-800">
            Para usar bien el panel diario necesitas tener al menos una destreza
            positiva y una conducta negativa activas. Puedes configurarlas desde
            la pantalla de Destrezas.
          </div>
        ) : null}

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
          <div>
            <DailyPanelStudentList
            classId={classId}
            students={students ?? []}
            dailyScores={dailyScores}
            dailyNegativeCounts={dailyNegativeCounts}
            positiveSkills={positiveSkills}
            negativeSkills={negativeSkills}
            soundEnabled={profile?.sound_enabled ?? true}
            />
            </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Registros de hoy</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Últimas acciones guardadas.
                </p>
              </div>

              <span className="text-sm text-slate-500">
                {todayRecords?.length ?? 0}
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {!todayRecords || todayRecords.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    Todavía no hay registros hoy.
                  </p>
                </div>
              ) : (
                todayRecords.slice(0, 12).map((record) => (
                  <article
                    key={record.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {studentNameById.get(record.student_id) ??
                            "Alumno no encontrado"}
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          {skillNameById.get(record.skill_id ?? "") ??
                            "Sin destreza"}
                        </p>
                      </div>

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
                    </div>

                    {record.note ? (
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {record.note}
                      </p>
                    ) : null}

                    <p className="mt-3 text-xs text-slate-500">
                      {formatTime(record.recorded_at)}
                    </p>
                  </article>
                ))
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}