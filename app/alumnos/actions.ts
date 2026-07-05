"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function updateStudentAvatarAction(formData: FormData) {
  const classId = cleanText(formData.get("classId"));
  const studentId = cleanText(formData.get("studentId"));
  const avatarKey = cleanText(formData.get("avatarKey"));

  if (!classId || !studentId || !avatarKey) {
    redirect("/panel");
  }

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("class_id", classId)
    .eq("teacher_id", userId)
    .single();

  if (studentError || !student) {
    redirect(`/clases/${classId}`);
  }

  const { error: updateError } = await supabase
    .from("students")
    .update({
      avatar_key: avatarKey,
    })
    .eq("id", studentId)
    .eq("teacher_id", userId);

  if (updateError) {
    console.error("Error updating student avatar:", updateError);
    redirect(
      `/clases/${classId}/alumnos/${studentId}?error=avatar-update-failed`,
    );
  }

  revalidatePath(`/clases/${classId}`);
  revalidatePath(`/clases/${classId}/panel`);
  revalidatePath(`/clases/${classId}/alumnos/${studentId}`);

  redirect(
    `/clases/${classId}/alumnos/${studentId}?success=avatar-updated`,
  );
}