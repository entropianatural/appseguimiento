import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createSkillAction,
  createSkillCategoryAction,
  deleteSkillCategoryAction,
  toggleSkillActiveAction,
} from "@/app/destrezas/actions";
import { createClient } from "@/lib/supabase/server";

type SkillsPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function getErrorMessage(error?: string) {
  if (error === "category-name-required") {
    return "El nombre de la categoría es obligatorio.";
  }

  if (error === "category-duplicated") {
    return "Ya existe una categoría con ese nombre.";
  }

  if (error === "category-create-failed") {
    return "No se ha podido crear la categoría.";
  }

  if (error === "category-not-found") {
    return "La categoría seleccionada no existe.";
  }

  if (error === "category-has-skills") {
    return "No puedes eliminar una categoría que todavía tiene destrezas asociadas.";
  }

  if (error === "category-delete-failed") {
    return "No se ha podido eliminar la categoría.";
  }

  if (error === "skill-name-required") {
    return "El nombre de la destreza es obligatorio.";
  }

  if (error === "skill-type-invalid") {
    return "El tipo de destreza no es válido.";
  }

  if (error === "skill-value-invalid") {
    return "El valor debe ser un número entero distinto de 0.";
  }

  if (error === "skill-duplicated") {
    return "Ya existe una destreza con ese nombre.";
  }

  if (error === "skill-create-failed") {
    return "No se ha podido crear la destreza.";
  }

  if (error === "skill-toggle-failed") {
    return "No se ha podido activar o desactivar la destreza.";
  }

  return null;
}

function getTypeLabel(type: string) {
  if (type === "positive") {
    return "Positiva";
  }

  return "Negativa";
}

function getTypeClasses(type: string) {
  if (type === "positive") {
    return "bg-green-100 text-green-700";
  }

  return "bg-red-100 text-red-700";
}

export default async function SkillsPage({ searchParams }: SkillsPageProps) {
  const params = await searchParams;
  const errorMessage = getErrorMessage(params.error);

  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  const claims = data?.claims;

  if (error || !claims) {
    redirect("/login");
  }

  const userId = claims.sub;

  const { data: categories, error: categoriesError } = await supabase
    .from("skill_categories")
    .select("id, name, description, color, icon, created_at")
    .eq("teacher_id", userId)
    .order("created_at", { ascending: true });

  if (categoriesError) {
    console.error("Error loading categories:", categoriesError);
  }

  const { data: skills, error: skillsError } = await supabase
    .from("skills")
    .select(
      "id, category_id, name, description, default_type, default_value, color, icon, is_active, created_at",
    )
    .eq("teacher_id", userId)
    .order("default_type", { ascending: false })
    .order("name", { ascending: true });

  if (skillsError) {
    console.error("Error loading skills:", skillsError);
  }

  const categoryNameById = new Map(
    (categories ?? []).map((category) => [category.id, category.name]),
  );

  const positiveSkills = (skills ?? []).filter(
    (skill) => skill.default_type === "positive",
  );

  const negativeSkills = (skills ?? []).filter(
    (skill) => skill.default_type === "negative",
  );

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link href="/panel" className="text-sm font-semibold text-blue-700">
            ← Volver al panel
          </Link>
        </div>

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-blue-700">
            Configuración pedagógica
          </p>
          <h1 className="mt-1 text-3xl font-bold">Categorías y destrezas</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Configura las habilidades, conductas, actitudes o destrezas que
            luego podrás asociar a cada registro diario del alumnado.
          </p>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Crear categoría</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Las categorías ayudan a agrupar destrezas relacionadas.
              </p>

              <form action={createSkillCategoryAction} className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="categoryName"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Nombre
                  </label>
                  <input
                    id="categoryName"
                    name="name"
                    type="text"
                    required
                    placeholder="Convivencia"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="categoryDescription"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Descripción opcional
                  </label>
                  <textarea
                    id="categoryDescription"
                    name="description"
                    rows={3}
                    placeholder="Respeto, empatía, ayuda, normas de convivencia..."
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="categoryColor"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Color
                    </label>
                    <select
                      id="categoryColor"
                      name="color"
                      defaultValue="blue"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="blue">Azul</option>
                      <option value="green">Verde</option>
                      <option value="red">Rojo</option>
                      <option value="yellow">Amarillo</option>
                      <option value="purple">Morado</option>
                      <option value="pink">Rosa</option>
                      <option value="slate">Gris</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="categoryIcon"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Icono
                    </label>
                    <select
                      id="categoryIcon"
                      name="icon"
                      defaultValue="folder"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="folder">Carpeta</option>
                      <option value="heart">Corazón</option>
                      <option value="users">Grupo</option>
                      <option value="book">Libro</option>
                      <option value="star">Estrella</option>
                      <option value="target">Diana</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  Crear categoría
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Crear destreza</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Cada registro diario deberá asociarse a una destreza o conducta.
              </p>

              <form action={createSkillAction} className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="skillName"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Nombre
                  </label>
                  <input
                    id="skillName"
                    name="name"
                    type="text"
                    required
                    placeholder="Participación"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="skillDescription"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Descripción opcional
                  </label>
                  <textarea
                    id="skillDescription"
                    name="description"
                    rows={3}
                    placeholder="Interviene de forma adecuada y aporta ideas al grupo."
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="categoryId"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Categoría
                  </label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">Sin categoría</option>
                    {(categories ?? []).map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="defaultType"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Tipo
                    </label>
                    <select
                      id="defaultType"
                      name="defaultType"
                      defaultValue="positive"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="positive">Positiva</option>
                      <option value="negative">Negativa</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="defaultValue"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Valor
                    </label>
                    <input
                      id="defaultValue"
                      name="defaultValue"
                      type="number"
                      defaultValue={1}
                      min={1}
                      required
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="skillColor"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Color
                    </label>
                    <select
                      id="skillColor"
                      name="color"
                      defaultValue="green"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="green">Verde</option>
                      <option value="red">Rojo</option>
                      <option value="blue">Azul</option>
                      <option value="yellow">Amarillo</option>
                      <option value="purple">Morado</option>
                      <option value="pink">Rosa</option>
                      <option value="slate">Gris</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="skillIcon"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Icono
                    </label>
                    <select
                      id="skillIcon"
                      name="icon"
                      defaultValue="star"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="star">Estrella</option>
                      <option value="heart">Corazón</option>
                      <option value="users">Grupo</option>
                      <option value="book">Libro</option>
                      <option value="target">Diana</option>
                      <option value="plus">Más</option>
                      <option value="minus">Menos</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  Crear destreza
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Categorías</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Agrupan las destrezas y conductas.
                  </p>
                </div>

                <span className="text-sm text-slate-500">
                  {categories?.length ?? 0} categorías
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {!categories || categories.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center sm:col-span-2">
                    <p className="font-medium text-slate-700">
                      Todavía no tienes categorías.
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Crea una categoría para organizar tus destrezas.
                    </p>
                  </div>
                ) : (
                  categories.map((category) => (
                    <article
                      key={category.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {category.name}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Icono: {category.icon || "folder"} · Color:{" "}
                            {category.color || "blue"}
                          </p>
                        </div>
                      </div>

                      {category.description ? (
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {category.description}
                        </p>
                      ) : null}

                      <form
                        action={deleteSkillCategoryAction}
                        className="mt-4"
                      >
                        <input
                          type="hidden"
                          name="categoryId"
                          value={category.id}
                        />
                        <button
                          type="submit"
                          className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </form>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Destrezas positivas</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Se usarán para registros positivos.
                  </p>
                </div>

                <span className="text-sm text-slate-500">
                  {positiveSkills.length} positivas
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {positiveSkills.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <p className="font-medium text-slate-700">
                      Todavía no hay destrezas positivas.
                    </p>
                  </div>
                ) : (
                  positiveSkills.map((skill) => (
                    <article
                      key={skill.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-900">
                              {skill.name}
                            </h3>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${getTypeClasses(
                                skill.default_type,
                              )}`}
                            >
                              {getTypeLabel(skill.default_type)}
                            </span>
                            {!skill.is_active ? (
                              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                                Inactiva
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-1 text-sm text-slate-500">
                            Valor: {skill.default_value} · Categoría:{" "}
                            {skill.category_id
                              ? categoryNameById.get(skill.category_id) ??
                                "Sin categoría"
                              : "Sin categoría"}
                          </p>

                          {skill.description ? (
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                              {skill.description}
                            </p>
                          ) : null}
                        </div>

                        <form action={toggleSkillActiveAction}>
                          <input
                            type="hidden"
                            name="skillId"
                            value={skill.id}
                          />
                          <input
                            type="hidden"
                            name="nextState"
                            value={skill.is_active ? "false" : "true"}
                          />
                          <button
                            type="submit"
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            {skill.is_active ? "Desactivar" : "Activar"}
                          </button>
                        </form>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Conductas negativas</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Se usarán para registros negativos.
                  </p>
                </div>

                <span className="text-sm text-slate-500">
                  {negativeSkills.length} negativas
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {negativeSkills.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <p className="font-medium text-slate-700">
                      Todavía no hay conductas negativas.
                    </p>
                  </div>
                ) : (
                  negativeSkills.map((skill) => (
                    <article
                      key={skill.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-900">
                              {skill.name}
                            </h3>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${getTypeClasses(
                                skill.default_type,
                              )}`}
                            >
                              {getTypeLabel(skill.default_type)}
                            </span>
                            {!skill.is_active ? (
                              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                                Inactiva
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-1 text-sm text-slate-500">
                            Valor: {skill.default_value} · Categoría:{" "}
                            {skill.category_id
                              ? categoryNameById.get(skill.category_id) ??
                                "Sin categoría"
                              : "Sin categoría"}
                          </p>

                          {skill.description ? (
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                              {skill.description}
                            </p>
                          ) : null}
                        </div>

                        <form action={toggleSkillActiveAction}>
                          <input
                            type="hidden"
                            name="skillId"
                            value={skill.id}
                          />
                          <input
                            type="hidden"
                            name="nextState"
                            value={skill.is_active ? "false" : "true"}
                          />
                          <button
                            type="submit"
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            {skill.is_active ? "Desactivar" : "Activar"}
                          </button>
                        </form>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}