import Link from "next/link";
import { redirect } from "next/navigation";
import { AppLogoLink } from "@/components/app-logo-link";
import {
  addStudentAction,
  archiveStudentAction,
} from "@/app/clases/actions";
import { getStudentAvatarUrl } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/server";

type ClassDetailPageProps = {
  params: Promise<{
    classId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    imported?: string;
  }>;
};

function getErrorMessage(error?: string) {
  if (error === "student-name-required") {
    return "El nombre y los apellidos del alumno son obligatorios.";
  }

  if (error === "invalid-list-number") {
    return "El número de lista debe ser un número entero positivo.";
  }

  if (error === "student-duplicated") {
    return "Ya existe un alumno activo con ese nombre y apellidos en esta clase.";
  }

  if (error === "student-create-failed") {
    return "No se ha podido crear el alumno. Revisa los datos.";
  }

  if (error === "student-archive-failed") {
    return "No se ha podido archivar el alumno.";
  }

  return null;
}

function getInitials(firstName: string, lastName: string) {
  const first = firstName.trim().charAt(0).toUpperCase();
  const last = lastName.trim().charAt(0).toUpperCase();

  return `${first}${last}`;
}

export default async function ClassDetailPage({
  params,
  searchParams,
}: ClassDetailPageProps) {
  const { classId } = await params;
  const currentSearchParams = await searchParams;
  const errorMessage = getErrorMessage(currentSearchParams.error);

  const importedCount = currentSearchParams.imported
  ? Number(currentSearchParams.imported)
  : null;

  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  const claims = data?.claims;

  if (error || !claims) {
    redirect("/login");
  }

  const userId = claims.sub;

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
    .select(
      "id, first_name, last_name, list_number, external_id, avatar_key, created_at",
    )
    .eq("class_id", classId)
    .eq("teacher_id", userId)
    .is("archived_at", null)
    .order("list_number", { ascending: true, nullsFirst: false })
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (studentsError) {
    console.error("Error loading students:", studentsError);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
            <AppLogoLink compact />
        </div>
        <div className="mb-6">
          <Link href="/panel" className="text-sm font-semibold text-blue-700">
            ← Volver al panel
          </Link>
        </div>

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-blue-700">Clase</p>
          <h1 className="mt-1 text-3xl font-bold">{classGroup.name}</h1>

          <div className="mt-3 flex flex-col gap-1 text-sm text-slate-600 sm:flex-row sm:gap-4">
            <span>
              Curso: {classGroup.academic_year || "sin curso académico"}
            </span>
            <span>{students?.length ?? 0} alumnos activos</span>
          </div>

          {classGroup.description ? (
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
              {classGroup.description}
            </p>
          ) : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <a
              href="#alumnado"
              className="rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
            >
              Gestionar alumnado
            </a>

            <Link
                href={`/clases/${classId}/panel`}
                className="rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
            >
                Abrir panel diario
            </Link>

            <Link
                href={`/clases/${classId}/importar`}
                className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-center font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                Importar CSV
            </Link>

            <Link
                href="/destrezas"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                Configurar destrezas
            </Link>


            <Link
            href={`/clases/${classId}/analitica`}
            className="rounded-xl border border-purple-200 bg-purple-50 px-5 py-3 text-center font-semibold text-purple-700 transition hover:bg-purple-100"
            >
            Analítica
            </Link>
          </div>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {typeof importedCount === "number" && importedCount > 0 ? (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Se han importado {importedCount} alumnos correctamente.
        </div>
        ) : null}

        <section
          id="alumnado"
          className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Añadir alumno</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Añade alumnos manualmente. Después incorporaremos la importación
              mediante CSV.
            </p>

            <form action={addStudentAction} className="mt-6 space-y-5">
              <input type="hidden" name="classId" value={classId} />

              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-slate-700"
                >
                  Nombre
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  placeholder="Ana"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-slate-700"
                >
                  Apellidos
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  placeholder="García López"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="listNumber"
                  className="block text-sm font-medium text-slate-700"
                >
                  Número de lista opcional
                </label>
                <input
                  id="listNumber"
                  name="listNumber"
                  type="number"
                  min="1"
                  placeholder="1"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="externalId"
                  className="block text-sm font-medium text-slate-700"
                >
                  Identificador opcional
                </label>
                <input
                  id="externalId"
                  name="externalId"
                  type="text"
                  placeholder="ID interno del centro"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Añadir alumno
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Alumnado</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Alumnos activos de esta clase.
                </p>
              </div>

              <span className="text-sm text-slate-500">
                {students?.length ?? 0} alumnos
              </span>
            </div>

            <div className="mt-6">
              {!students || students.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <p className="font-medium text-slate-700">
                    Todavía no hay alumnos.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Añade el primer alumno usando el formulario.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {students.map((student) => (
                    <article
                      key={student.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="flex items-start gap-4">
                        <img
                        src={getStudentAvatarUrl(student)}
                        alt={`Avatar de ${student.first_name} ${student.last_name}`}
                        className="h-10 w-10 rounded-full bg-blue-50 object-cover ring-1 ring-blue-100"
                        />

                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/clases/${classId}/alumnos/${student.id}`}
                            className="font-semibold text-slate-900 transition hover:text-blue-700"
                            >
                            {student.first_name} {student.last_name}
                          </Link>

                          <div className="mt-1 space-y-1 text-sm text-slate-600">
                            <p>
                              Nº lista:{" "}
                              {student.list_number
                                ? student.list_number
                                : "sin asignar"}
                            </p>

                            {student.external_id ? (
                              <p>ID: {student.external_id}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <form action={archiveStudentAction} className="mt-4">
                        <input type="hidden" name="classId" value={classId} />
                        <input
                          type="hidden"
                          name="studentId"
                          value={student.id}
                        />

                        <button
                          type="submit"
                          className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                        >
                          Archivar
                        </button>
                      </form>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}