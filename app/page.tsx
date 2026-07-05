import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col items-center justify-center">
        <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto max-w-xl">
            <Image
              src="/logo-dia-a-dia-escolar.png"
              alt="Día a Día Escolar"
              width={520}
              height={320}
              priority
              className="mx-auto h-auto w-full max-w-md rounded-3xl object-contain"
            />

            <h1 className="mt-8 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Día a Día Escolar
            </h1>

            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              Seguimiento diario de alumnos, registros positivos y negativos,
              evolución individual y analítica de clase.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="rounded-xl bg-blue-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
              >
                Crear cuenta
              </Link>

              <Link
                href="/login"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}