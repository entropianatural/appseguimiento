"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { createBehaviorRecordAction } from "@/app/registros/actions";
import { getStudentAvatarUrl } from "@/lib/avatar";

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

type StudentRecordCardProps = {
  classId: string;
  student: Student;
  dailyScore: number;
  dailyNegativeCount: number;
  positiveSkills: Skill[];
  negativeSkills: Skill[];
  soundEnabled: boolean;
};

function getInitials(firstName: string, lastName: string) {
  const first = firstName.trim().charAt(0).toUpperCase();
  const last = lastName.trim().charAt(0).toUpperCase();

  return `${first}${last}`;
}

function getScoreClasses(score: number) {
  if (score > 0) {
    return "bg-green-100 text-green-700 ring-green-200";
  }

  if (score < 0) {
    return "bg-red-100 text-red-700 ring-red-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function playTone(frequency: number, duration: number, type: OscillatorType) {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.12,
    audioContext.currentTime + 0.02,
  );
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    audioContext.currentTime + duration,
  );

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);

  oscillator.onended = () => {
    void audioContext.close();
  };
}

function playPositiveSound() {
  playTone(660, 0.12, "sine");

  window.setTimeout(() => {
    playTone(880, 0.14, "sine");
  }, 90);
}

function playNegativeSound() {
  playTone(220, 0.16, "triangle");

  window.setTimeout(() => {
    playTone(180, 0.14, "triangle");
  }, 100);
}

function getCardBackgroundClass(dailyNegativeCount: number) {
  if (dailyNegativeCount >= 4) {
    return "bg-[#FFA588]";
  }

  if (dailyNegativeCount >= 2) {
    return "bg-[#FFF593]";
  }

  return "bg-white";
}

export function StudentRecordCard({
  classId,
  student,
  dailyScore,
  dailyNegativeCount,
  positiveSkills,
  negativeSkills,
  soundEnabled,
}: StudentRecordCardProps) {
  const [selectedType, setSelectedType] = useState<RecordType | null>(null);
  const [isPending, startTransition] = useTransition();

  const availableSkills = useMemo(() => {
    if (selectedType === "positive") {
      return positiveSkills;
    }

    if (selectedType === "negative") {
      return negativeSkills;
    }

    return [];
  }, [negativeSkills, positiveSkills, selectedType]);

  const selectedTypeLabel =
    selectedType === "positive" ? "positivo" : "negativo";

  function handleSubmit(formData: FormData) {
    if (soundEnabled && selectedType === "positive") {
      playPositiveSound();
    }

    if (soundEnabled && selectedType === "negative") {
      playNegativeSound();
    }

    startTransition(() => {
      void createBehaviorRecordAction(formData);
    });
  }

  return (
    <article
        className={`overflow-hidden rounded-2xl border border-slate-200 shadow-sm ${getCardBackgroundClass(
            dailyNegativeCount,
        )}`}
        >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <img
            src={getStudentAvatarUrl(student)}
            alt={`Avatar de ${student.first_name} ${student.last_name}`}
            className="h-14 w-14 shrink-0 rounded-2xl bg-blue-50 object-cover ring-1 ring-blue-100"
            />

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Link
                    href={`/clases/${classId}/alumnos/${student.id}`}
                    className="text-base font-bold text-slate-900 transition hover:text-blue-700 sm:text-lg"
                    >
                    {student.first_name} {student.last_name}
                </Link>

                <p className="mt-1 text-sm text-slate-500">
                  Nº lista: {student.list_number ?? "sin asignar"}
                </p>
              </div>

              <div
                className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-bold ring-1 ${getScoreClasses(
                  dailyScore,
                )}`}
              >
                {dailyScore > 0 ? "+" : ""}
                {dailyScore} hoy
              </div>
            </div>

            {dailyNegativeCount >= 2 ? (
            <div
                className={
                dailyNegativeCount >= 4
                    ? "mt-2 w-fit rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200"
                    : "mt-2 w-fit rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800 ring-1 ring-yellow-200"
                }
            >
                {dailyNegativeCount} negativos hoy
            </div>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setSelectedType((current) =>
                    current === "positive" ? null : "positive",
                  )
                }
                className={
                  selectedType === "positive"
                    ? "rounded-2xl bg-green-700 px-4 py-4 text-base font-bold text-white ring-4 ring-green-100 transition"
                    : "rounded-2xl bg-green-600 px-4 py-4 text-base font-bold text-white transition hover:bg-green-700"
                }
              >
                + Positivo
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedType((current) =>
                    current === "negative" ? null : "negative",
                  )
                }
                className={
                  selectedType === "negative"
                    ? "rounded-2xl bg-red-700 px-4 py-4 text-base font-bold text-white ring-4 ring-red-100 transition"
                    : "rounded-2xl bg-red-600 px-4 py-4 text-base font-bold text-white transition hover:bg-red-700"
                }
              >
                - Negativo
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedType ? (
        <div
          className={
            selectedType === "positive"
              ? "border-t border-green-100 bg-green-50 p-4 sm:p-5"
              : "border-t border-red-100 bg-red-50 p-4 sm:p-5"
          }
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h4 className="font-bold text-slate-900">
              Registrar {selectedTypeLabel}
            </h4>

            <p className="text-sm text-slate-600">
              {student.first_name} {student.last_name}
            </p>
          </div>

          {availableSkills.length === 0 ? (
            <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm leading-6 text-yellow-800">
              No hay destrezas{" "}
              {selectedType === "positive" ? "positivas" : "negativas"} activas.
              Ve a la pantalla de Destrezas y crea al menos una.
            </div>
          ) : (
            <form action={handleSubmit} className="mt-4 space-y-4">
              <input type="hidden" name="classId" value={classId} />
              <input type="hidden" name="studentId" value={student.id} />
              <input type="hidden" name="recordType" value={selectedType} />

              <div>
                <label
                  htmlFor={`skill-${student.id}-${selectedType}`}
                  className="block text-sm font-semibold text-slate-700"
                >
                  Destreza o conducta
                </label>

                <select
                  id={`skill-${student.id}-${selectedType}`}
                  name="skillId"
                  required
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  {availableSkills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name} ({skill.default_value > 0 ? "+" : ""}
                      {skill.default_value})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={`note-${student.id}-${selectedType}`}
                  className="block text-sm font-semibold text-slate-700"
                >
                  Observación opcional
                </label>

                <textarea
                  id={`note-${student.id}-${selectedType}`}
                  name="note"
                  rows={3}
                  maxLength={500}
                  placeholder="Ejemplo: ha ayudado a un compañero durante la actividad."
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className={
                    selectedType === "positive"
                      ? "rounded-xl bg-green-600 px-5 py-4 text-base font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      : "rounded-xl bg-red-600 px-5 py-4 text-base font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  }
                >
                  {isPending ? "Guardando..." : "Guardar"}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedType(null)}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-4 text-base font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </article>
  );
}