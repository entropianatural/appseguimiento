import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { createClassAction } from "@/app/clases/actions";
import { AppLogoLink } from "@/components/app-logo-link";
import { createClient } from "@/lib/supabase/server";

type PanelPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function getErrorMessage(error?: string) {
  if (error === "class-name-required") {
    return "El nombre de la clase es obligatorio.";
  }

  if (error === "class-create-failed") {
    return "No se ha podido crear la clase. Revisa los datos e inténtalo de nuevo.";
  }

  return null;
}

export default async function PanelPage({ searchParams }: PanelPageProps) {
  const params = await searchParams;
  const errorMessage = getErrorMessage(params.error);

  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  const claims = data?.claims;

  if (error || !claims) {
    redirect("/login");
  }

  const userId = claims.sub;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, sound_enabled, theme")
    .eq("id", userId)
    .single();

  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name, academic_year, description, created_at")
    .eq("teacher_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (classesError) {
    console.error("Error loading classes:", classesError);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
            <AppLogoLink />
        </div>
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700">
              AppSeguimiento
            </p>
            <h1 className="mt-1 text-3xl font-bold">Panel docente</h1>
            <p className="mt-2 text-sm text-slate-600">
              Hola, {profile?.full_name || "docente"}. Gestiona tus clases y
              empieza el seguimiento diario.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
                href="/destrezas"
                className="rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
            >
                Destrezas
            </Link>

            <form action={signOutAction}>
                <button
                type="submit"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                Cerrar sesión
                </button>
            </form>
            </div>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-6 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Mis clases</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Entra en una clase para gestionar su alumnado.
                </p>
              </div>

              <span className="text-sm text-slate-500">
                {classes?.length ?? 0} clases
              </span>
            </div>

            <div className="mt-6">
              {!classes || classes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <p className="font-medium text-slate-700">
                    Todavía no has creado ninguna clase.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Crea tu primera clase usando el formulario de la izquierda.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,360px))] gap-4">
                  {classes.map((classGroup) => ( 
                    <Link
                      key={classGroup.id}
                      href={`/clases/${classGroup.id}/panel`}
                      className="flex min-h-[150px] flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      <h3 className="text-lg font-semibold text-slate-900">
                        {classGroup.name}
                      </h3>

                      <p className="mt-1 text-sm text-slate-600">
                        {classGroup.academic_year || "Sin curso académico"}
                      </p>

                      {classGroup.description ? (
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                          {classGroup.description}
                        </p>
                      ) : (
                        <p className="mt-3 text-sm leading-6 text-slate-500">
                          Sin descripción.
                        </p>
                      )}

                      <span className="mt-auto pt-4 inline-flex text-sm font-semibold text-blue-700">
                        Entrar en la clase →
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Crear clase</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Crea un grupo para asociar después el alumnado y los registros
              diarios.
            </p>

            <form action={createClassAction} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-slate-700"
                >
                  Nombre de la clase
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="1º ESO A"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="academicYear"
                  className="block text-sm font-medium text-slate-700"
                >
                  Curso académico
                </label>
                <input
                  id="academicYear"
                  name="academicYear"
                  type="text"
                  placeholder="2026/2027"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-slate-700"
                >
                  Descripción opcional
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="Grupo bilingüe, tutoría, desdoble..."
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Crear clase
              </button>
            </form>
          </div>

          
        </section>
      </div>
    </main>
  );
}