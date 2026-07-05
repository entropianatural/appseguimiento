"use client";

import { useMemo, useState } from "react";
import { StudentRecordCard } from "@/components/student-record-card";

type RecordType = "positive" | "negative";

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  list_number: number | null;
  avatar_key: string | null;
};

type Skill = {
  id: string;
  name: string;
  default_type: RecordType;
  default_value: number;
};

type DailyPanelStudentListProps = {
  classId: string;
  students: Student[];
  dailyScores: Record<string, number>;
  dailyNegativeCounts: Record<string, number>;
  positiveSkills: Skill[];
  negativeSkills: Skill[];
  soundEnabled: boolean;
};

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function DailyPanelStudentList({
  classId,
  students,
  dailyScores,
  dailyNegativeCounts = {},
  positiveSkills,
  negativeSkills,
  soundEnabled,
}: DailyPanelStudentListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStudents = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);

    if (!normalizedSearch) {
      return students;
    }

    return students.filter((student) => {
      const fullName = normalizeText(
        `${student.first_name} ${student.last_name}`,
      );

      const listNumber = student.list_number
        ? String(student.list_number)
        : "";

      return (
        fullName.includes(normalizedSearch) ||
        listNumber.includes(normalizedSearch)
      );
    });
  }, [searchTerm, students]);

  return (
    <section>
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Alumnado</h2>
            <p className="mt-1 text-sm text-slate-600">
              Busca un alumno por nombre, apellidos o número de lista.
            </p>
          </div>

          <div className="text-sm text-slate-500">
            Mostrando{" "}
            <span className="font-semibold text-slate-900">
              {filteredStudents.length}
            </span>{" "}
            de{" "}
            <span className="font-semibold text-slate-900">
              {students.length}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="studentSearch" className="sr-only">
            Buscar alumno
          </label>
          <input
            id="studentSearch"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar alumno..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-medium text-slate-700">
            Esta clase todavía no tiene alumnos.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Añade alumnos manualmente o impórtalos mediante CSV.
          </p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-medium text-slate-700">
            No hay alumnos que coincidan con la búsqueda.
          </p>
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Limpiar búsqueda
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredStudents.map((student) => (
            <StudentRecordCard
            key={student.id}
            classId={classId}
            student={student}
            dailyScore={dailyScores[student.id] ?? 0}
            dailyNegativeCount={dailyNegativeCounts?.[student.id] ?? 0}
            positiveSkills={positiveSkills}
            negativeSkills={negativeSkills}
            soundEnabled={soundEnabled}
            />
          ))}
        </div>
      )}
    </section>
  );
}