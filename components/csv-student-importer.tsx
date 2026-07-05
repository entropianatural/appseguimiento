"use client";

import Papa from "papaparse";
import { useMemo, useState } from "react";
import { importStudentsCsvAction } from "@/app/clases/actions";

type CsvStudentImporterProps = {
  classId: string;
};

type CsvInputRow = Record<string, string | undefined>;

type PreviewStudent = {
  rowNumber: number;
  firstName: string;
  lastName: string;
  listNumber: number | null;
  externalId: string | null;
  errors: string[];
};

function normalizeHeader(header: string) {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

function getField(row: CsvInputRow, possibleNames: string[]) {
  for (const name of possibleNames) {
    const value = row[name];

    if (value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
}

function parseListNumber(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return Number.NaN;
  }

  return parsed;
}

function buildNameKey(firstName: string, lastName: string) {
  return `${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}`;
}

export function CsvStudentImporter({ classId }: CsvStudentImporterProps) {
  const [fileName, setFileName] = useState("");
  const [previewStudents, setPreviewStudents] = useState<PreviewStudent[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validStudents = useMemo(
    () => previewStudents.filter((student) => student.errors.length === 0),
    [previewStudents],
  );

  const invalidStudents = useMemo(
    () => previewStudents.filter((student) => student.errors.length > 0),
    [previewStudents],
  );

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setGeneralError(null);
    setPreviewStudents([]);

    if (!file) {
      setFileName("");
      return;
    }

    setFileName(file.name);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setGeneralError("El archivo debe tener extensión .csv.");
      return;
    }

    Papa.parse<CsvInputRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
      complete(results) {
        if (results.errors.length > 0) {
          setGeneralError(
            "No se ha podido leer correctamente el CSV. Revisa el formato del archivo.",
          );
          return;
        }

        const rows = results.data;

        if (rows.length === 0) {
          setGeneralError("El archivo CSV está vacío.");
          return;
        }

        if (rows.length > 300) {
          setGeneralError(
            "El archivo contiene demasiadas filas. Para esta versión, importa como máximo 300 alumnos a la vez.",
          );
          return;
        }

        const seenNames = new Set<string>();
        const seenListNumbers = new Set<number>();
        const seenExternalIds = new Set<string>();

        const parsedRows: PreviewStudent[] = rows.map((row, index) => {
          const firstName = getField(row, ["nombre", "first_name", "firstname"]);
          const lastName = getField(row, [
            "apellidos",
            "apellido",
            "last_name",
            "lastname",
          ]);
          const listNumberText = getField(row, [
            "numero_lista",
            "n_lista",
            "num_lista",
            "lista",
            "numero",
            "n",
          ]);
          const externalId = getField(row, [
            "identificador",
            "external_id",
            "id",
            "codigo",
            "codigo_alumno",
          ]);

          const listNumber = parseListNumber(listNumberText);
          const errors: string[] = [];

          if (!firstName) {
            errors.push("Falta el nombre.");
          }

          if (!lastName) {
            errors.push("Faltan los apellidos.");
          }

          if (Number.isNaN(listNumber)) {
            errors.push("El número de lista no es válido.");
          }

          const nameKey = buildNameKey(firstName, lastName);

          if (firstName && lastName) {
            if (seenNames.has(nameKey)) {
              errors.push("Alumno duplicado dentro del CSV.");
            }

            seenNames.add(nameKey);
          }

          if (typeof listNumber === "number") {
            if (seenListNumbers.has(listNumber)) {
              errors.push("Número de lista repetido dentro del CSV.");
            }

            seenListNumbers.add(listNumber);
          }

          if (externalId) {
            const externalIdKey = externalId.toLowerCase();

            if (seenExternalIds.has(externalIdKey)) {
              errors.push("Identificador repetido dentro del CSV.");
            }

            seenExternalIds.add(externalIdKey);
          }

          return {
            rowNumber: index + 2,
            firstName,
            lastName,
            listNumber: Number.isNaN(listNumber) ? null : listNumber,
            externalId: externalId || null,
            errors,
          };
        });

        setPreviewStudents(parsedRows);
      },
      error() {
        setGeneralError("No se ha podido leer el archivo CSV.");
      },
    });
  }

  const studentsJson = JSON.stringify(
    validStudents.map((student) => ({
      firstName: student.firstName,
      lastName: student.lastName,
      listNumber: student.listNumber,
      externalId: student.externalId,
    })),
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Seleccionar archivo CSV</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          El archivo debe incluir al menos las columnas{" "}
          <strong>nombre</strong> y <strong>apellidos</strong>.
        </p>

        <div className="mt-5">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="block w-full cursor-pointer rounded-xl border border-slate-300 bg-white text-sm text-slate-700 file:mr-4 file:border-0 file:bg-blue-600 file:px-4 file:py-3 file:font-semibold file:text-white hover:file:bg-blue-700"
          />
        </div>

        {fileName ? (
          <p className="mt-3 text-sm text-slate-600">
            Archivo seleccionado: <strong>{fileName}</strong>
          </p>
        ) : null}

        {generalError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {generalError}
          </div>
        ) : null}
      </div>

      {previewStudents.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Vista previa</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Revisa los datos antes de importarlos.
              </p>
            </div>

            <div className="text-sm text-slate-600">
              <span className="font-semibold text-green-700">
                {validStudents.length} válidos
              </span>{" "}
              ·{" "}
              <span className="font-semibold text-red-700">
                {invalidStudents.length} con errores
              </span>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-3 py-3 font-semibold">Fila</th>
                  <th className="px-3 py-3 font-semibold">Nº</th>
                  <th className="px-3 py-3 font-semibold">Nombre</th>
                  <th className="px-3 py-3 font-semibold">Apellidos</th>
                  <th className="px-3 py-3 font-semibold">Identificador</th>
                  <th className="px-3 py-3 font-semibold">Estado</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {previewStudents.map((student) => (
                  <tr key={`${student.rowNumber}-${student.firstName}-${student.lastName}`}>
                    <td className="px-3 py-3 text-slate-500">
                      {student.rowNumber}
                    </td>
                    <td className="px-3 py-3">
                      {student.listNumber ?? "—"}
                    </td>
                    <td className="px-3 py-3">{student.firstName || "—"}</td>
                    <td className="px-3 py-3">{student.lastName || "—"}</td>
                    <td className="px-3 py-3">
                      {student.externalId || "—"}
                    </td>
                    <td className="px-3 py-3">
                      {student.errors.length === 0 ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Válido
                        </span>
                      ) : (
                        <div className="space-y-1">
                          {student.errors.map((error) => (
                            <p
                              key={error}
                              className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
                            >
                              {error}
                            </p>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form action={importStudentsCsvAction} className="mt-6">
            <input type="hidden" name="classId" value={classId} />
            <input type="hidden" name="studentsJson" value={studentsJson} />

            <button
              type="submit"
              disabled={validStudents.length === 0}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Importar {validStudents.length} alumnos válidos
            </button>
          </form>

          {invalidStudents.length > 0 ? (
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Las filas con errores no se importarán. Corrige el CSV y vuelve a
              cargarlo si quieres incluirlas.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}