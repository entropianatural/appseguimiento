import Link from "next/link";
import { redirect } from "next/navigation";
import { CsvStudentImporter } from "@/components/csv-student-importer";
import { createClient } from "@/lib/supabase/server";

type ImportStudentsPageProps = {
  params: Promise<{
    classId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

function getErrorMessage(error?: string) {
  if (error === "no-students") {
    return "No hay alumnos para importar.";
  }

  if (error === "invalid-json") {
    return "Los datos enviados no tienen un formato válido.";
  }

  if (error === "too-many-students") {
    return "El archivo contiene demasiados alumnos. Importa como máximo 300 a la vez.";
  }

  if (error === "no-valid-students") {
    return "No hay alumnos válidos para importar.";
  }

  if (error === "existing-check-failed") {
    return "No se han podido comprobar los alumnos existentes.";
  }

  if (error === "all-duplicated") {
    return "Todos los alumnos válidos parecen estar duplicados.";
  }

  if (error === "import-failed") {
    return "No se ha podido completar la importación.";
  }

  return null;
}

export default async function ImportStudentsPage({
  params,
  searchParams,
}: ImportStudentsPageProps) {
  const { classId } = await params;
  const currentSearchParams = await searchParams;
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

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            href={`/clases/${classId}`}
            className="text-sm font-semibold text-blue-700"
          >
            ← Volver a la clase
          </Link>
        </div>

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-blue-700">
            Importación CSV
          </p>
          <h1 className="mt-1 text-3xl font-bold">
            Importar alumnado en {classGroup.name}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Sube un archivo CSV con columnas de nombre, apellidos y, si quieres,
            número de lista o identificador. Verás una vista previa antes de
            guardar los alumnos.
          </p>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-6">
          <CsvStudentImporter classId={classId} />
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Formato recomendado</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Puedes copiar este ejemplo en una hoja de cálculo y exportarla como
            CSV.
          </p>

          <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm text-slate-100">
{`numero_lista,nombre,apellidos,identificador
1,Ana,García López,A001
2,Lucas,Martín Pérez,A002
3,Sofía,Ruiz Sánchez,A003`}
          </pre>
        </section>
      </div>
    </main>
  );
}