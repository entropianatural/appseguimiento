"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function getMadridDateString() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

function normalizeRecordType(value: string) {
  if (value === "positive" || value === "negative") {
    return value;
  }

  return null;
}

export async function createBehaviorRecordAction(formData: FormData) {
  const classId = cleanText(formData.get("classId"));
  const studentId = cleanText(formData.get("studentId"));
  const skillId = cleanText(formData.get("skillId"));
  const recordTypeText = cleanText(formData.get("recordType"));
  const note = cleanText(formData.get("note"));

  if (!classId) {
    redirect("/panel");
  }

  if (!studentId || !skillId) {
    redirect(`/clases/${classId}/panel?error=missing-record-data`);
  }

  const recordType = normalizeRecordType(recordTypeText);

  if (!recordType) {
    redirect(`/clases/${classId}/panel?error=invalid-record-type`);
  }

  if (note.length > 500) {
    redirect(`/clases/${classId}/panel?error=note-too-long`);
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

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("class_id", classId)
    .eq("teacher_id", userId)
    .is("archived_at", null)
    .single();

  if (studentError || !student) {
    redirect(`/clases/${classId}/panel?error=student-not-found`);
  }

  const { data: skill, error: skillError } = await supabase
    .from("skills")
    .select("id, default_type, default_value, is_active")
    .eq("id", skillId)
    .eq("teacher_id", userId)
    .single();

  if (skillError || !skill || !skill.is_active) {
    redirect(`/clases/${classId}/panel?error=skill-not-found`);
  }

  if (skill.default_type !== recordType) {
    redirect(`/clases/${classId}/panel?error=skill-type-mismatch`);
  }

  const { error: insertError } = await supabase.from("behavior_records").insert({
    class_id: classId,
    student_id: studentId,
    skill_id: skillId,
    record_date: getMadridDateString(),
    type: recordType,
    value: skill.default_value,
    note: note || null,
  });

  if (insertError) {
    console.error("Error creating behavior record:", insertError);
    redirect(`/clases/${classId}/panel?error=record-create-failed`);
  }

  revalidatePath(`/clases/${classId}/panel`);
  redirect(`/clases/${classId}/panel?success=record-created`);
}

export async function updateSoundEnabledAction(formData: FormData) {
  const classId = cleanText(formData.get("classId"));
  const soundEnabledText = cleanText(formData.get("soundEnabled"));

  if (!classId) {
    redirect("/panel");
  }

  const soundEnabled = soundEnabledText === "true";

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  const { error } = await supabase
    .from("profiles")
    .update({
      sound_enabled: soundEnabled,
    })
    .eq("id", userId);

  if (error) {
    console.error("Error updating sound preference:", error);
    redirect(`/clases/${classId}/panel?error=sound-update-failed`);
  }

  revalidatePath(`/clases/${classId}/panel`);
  redirect(`/clases/${classId}/panel`);
}