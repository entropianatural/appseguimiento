"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function createClassAction(formData: FormData) {
  const name = cleanText(formData.get("name"));
  const academicYear = cleanText(formData.get("academicYear"));
  const description = cleanText(formData.get("description"));

  if (!name) {
    redirect("/panel?error=class-name-required");
  }

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    redirect("/login");
  }

  const { error } = await supabase.from("classes").insert({
    name,
    academic_year: academicYear || null,
    description: description || null,
  });

  if (error) {
    console.error("Error creating class:", error);
    redirect("/panel?error=class-create-failed");
  }

  revalidatePath("/panel");
  redirect("/panel");
}

export async function addStudentAction(formData: FormData) {
  const classId = cleanText(formData.get("classId"));
  const firstName = cleanText(formData.get("firstName"));
  const lastName = cleanText(formData.get("lastName"));
  const listNumberText = cleanText(formData.get("listNumber"));
  const externalId = cleanText(formData.get("externalId"));

  if (!classId) {
    redirect("/panel");
  }

  if (!firstName || !lastName) {
    redirect(`/clases/${classId}?error=student-name-required`);
  }

  let listNumber: number | null = null;

  if (listNumberText) {
     const parsedListNumber = Number(listNumberText);

     if (!Number.isInteger(parsedListNumber) || parsedListNumber <= 0) {
        redirect(`/clases/${classId}?error=invalid-list-number`);
     }

     listNumber = parsedListNumber;
  }

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  const { data: existingStudent } = await supabase
    .from("students")
    .select("id")
    .eq("class_id", classId)
    .eq("teacher_id", userId)
    .ilike("first_name", firstName)
    .ilike("last_name", lastName)
    .is("archived_at", null)
    .maybeSingle();

  if (existingStudent) {
    redirect(`/clases/${classId}?error=student-duplicated`);
  }

  const { error } = await supabase.from("students").insert({
    class_id: classId,
    first_name: firstName,
    last_name: lastName,
    list_number: listNumber,
    external_id: externalId || null,
    avatar_key: "avatar-01",
  });

  if (error) {
    console.error("Error adding student:", error);
    redirect(`/clases/${classId}?error=student-create-failed`);
  }

  revalidatePath(`/clases/${classId}`);
  redirect(`/clases/${classId}`);
}

export async function archiveStudentAction(formData: FormData) {
  const classId = cleanText(formData.get("classId"));
  const studentId = cleanText(formData.get("studentId"));

  if (!classId || !studentId) {
    redirect("/panel");
  }

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  const { error } = await supabase
    .from("students")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("id", studentId)
    .eq("class_id", classId)
    .eq("teacher_id", userId);

  if (error) {
    console.error("Error archiving student:", error);
    redirect(`/clases/${classId}?error=student-archive-failed`);
  }

  revalidatePath(`/clases/${classId}`);
  redirect(`/clases/${classId}`);
}

export async function importStudentsCsvAction(formData: FormData) {
  const classId = cleanText(formData.get("classId"));
  const studentsJson = cleanText(formData.get("studentsJson"));

  if (!classId) {
    redirect("/panel");
  }

  if (!studentsJson) {
    redirect(`/clases/${classId}/importar?error=no-students`);
  }

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  const { data: classGroup, error: classError } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", userId)
    .is("archived_at", null)
    .single();

  if (classError || !classGroup) {
    redirect("/panel");
  }

  let parsedStudents: unknown;

  try {
    parsedStudents = JSON.parse(studentsJson);
  } catch {
    redirect(`/clases/${classId}/importar?error=invalid-json`);
  }

  if (!Array.isArray(parsedStudents)) {
    redirect(`/clases/${classId}/importar?error=invalid-json`);
  }

  if (parsedStudents.length === 0) {
    redirect(`/clases/${classId}/importar?error=no-students`);
  }

  if (parsedStudents.length > 300) {
    redirect(`/clases/${classId}/importar?error=too-many-students`);
  }

  type ImportedStudent = {
    firstName: string;
    lastName: string;
    listNumber: number | null;
    externalId: string | null;
  };

  function normalize(value: string) {
    return value.trim().toLowerCase();
  }

  const cleanedStudents: ImportedStudent[] = [];

  for (const item of parsedStudents) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = item as Partial<ImportedStudent>;

    const firstName = String(candidate.firstName ?? "").trim();
    const lastName = String(candidate.lastName ?? "").trim();

    const listNumber =
      candidate.listNumber === null ||
      candidate.listNumber === undefined ||
      candidate.listNumber === 0
        ? null
        : Number(candidate.listNumber);

    const externalId = String(candidate.externalId ?? "").trim() || null;

    if (!firstName || !lastName) {
      continue;
    }

    if (listNumber !== null && (!Number.isInteger(listNumber) || listNumber <= 0)) {
      continue;
    }

    cleanedStudents.push({
      firstName,
      lastName,
      listNumber,
      externalId,
    });
  }

  if (cleanedStudents.length === 0) {
    redirect(`/clases/${classId}/importar?error=no-valid-students`);
  }

  const { data: existingStudents, error: existingError } = await supabase
    .from("students")
    .select("first_name, last_name, list_number, external_id")
    .eq("class_id", classId)
    .eq("teacher_id", userId)
    .is("archived_at", null);

  if (existingError) {
    console.error("Error checking existing students:", existingError);
    redirect(`/clases/${classId}/importar?error=existing-check-failed`);
  }

  const existingNameKeys = new Set(
    (existingStudents ?? []).map((student) =>
      `${normalize(student.first_name)}|${normalize(student.last_name)}`,
    ),
  );

  const existingListNumbers = new Set(
    (existingStudents ?? [])
      .map((student) => student.list_number)
      .filter((value): value is number => typeof value === "number"),
  );

  const existingExternalIds = new Set(
    (existingStudents ?? [])
      .map((student) => student.external_id)
      .filter((value): value is string => Boolean(value))
      .map((value) => normalize(value)),
  );

  const seenNameKeys = new Set<string>();
  const seenListNumbers = new Set<number>();
  const seenExternalIds = new Set<string>();

  const studentsToInsert = cleanedStudents.filter((student) => {
    const nameKey = `${normalize(student.firstName)}|${normalize(student.lastName)}`;

    if (existingNameKeys.has(nameKey) || seenNameKeys.has(nameKey)) {
      return false;
    }

    seenNameKeys.add(nameKey);

    if (student.listNumber !== null) {
      if (
        existingListNumbers.has(student.listNumber) ||
        seenListNumbers.has(student.listNumber)
      ) {
        return false;
      }

      seenListNumbers.add(student.listNumber);
    }

    if (student.externalId) {
      const externalIdKey = normalize(student.externalId);

      if (
        existingExternalIds.has(externalIdKey) ||
        seenExternalIds.has(externalIdKey)
      ) {
        return false;
      }

      seenExternalIds.add(externalIdKey);
    }

    return true;
  });

  if (studentsToInsert.length === 0) {
    redirect(`/clases/${classId}/importar?error=all-duplicated`);
  }

  const { error: insertError } = await supabase.from("students").insert(
    studentsToInsert.map((student) => ({
      class_id: classId,
      first_name: student.firstName,
      last_name: student.lastName,
      list_number: student.listNumber,
      external_id: student.externalId,
      avatar_key: "avatar-01",
    })),
  );

  if (insertError) {
    console.error("Error importing students:", insertError);
    redirect(`/clases/${classId}/importar?error=import-failed`);
  }

  revalidatePath(`/clases/${classId}`);
  redirect(`/clases/${classId}?imported=${studentsToInsert.length}`);
}