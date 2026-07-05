"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function normalizeRecordType(value: string) {
  if (value === "positive" || value === "negative") {
    return value;
  }

  return null;
}

export async function createSkillCategoryAction(formData: FormData) {
  const name = cleanText(formData.get("name"));
  const description = cleanText(formData.get("description"));
  const color = cleanText(formData.get("color"));
  const icon = cleanText(formData.get("icon"));

  if (!name) {
    redirect("/destrezas?error=category-name-required");
  }

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  const { data: existingCategory } = await supabase
    .from("skill_categories")
    .select("id")
    .eq("teacher_id", userId)
    .ilike("name", name)
    .maybeSingle();

  if (existingCategory) {
    redirect("/destrezas?error=category-duplicated");
  }

  const { error } = await supabase.from("skill_categories").insert({
    name,
    description: description || null,
    color: color || "blue",
    icon: icon || "folder",
  });

  if (error) {
    console.error("Error creating skill category:", error);
    redirect("/destrezas?error=category-create-failed");
  }

  revalidatePath("/destrezas");
  redirect("/destrezas");
}

export async function createSkillAction(formData: FormData) {
  const categoryId = cleanText(formData.get("categoryId"));
  const name = cleanText(formData.get("name"));
  const description = cleanText(formData.get("description"));
  const defaultTypeText = cleanText(formData.get("defaultType"));
  const defaultValueText = cleanText(formData.get("defaultValue"));
  const color = cleanText(formData.get("color"));
  const icon = cleanText(formData.get("icon"));

  if (!name) {
    redirect("/destrezas?error=skill-name-required");
  }

  const defaultType = normalizeRecordType(defaultTypeText);

  if (!defaultType) {
    redirect("/destrezas?error=skill-type-invalid");
  }

  const numericValue = Number(defaultValueText);

  if (!Number.isInteger(numericValue) || numericValue === 0) {
    redirect("/destrezas?error=skill-value-invalid");
  }

  const defaultValue =
    defaultType === "positive"
      ? Math.abs(numericValue)
      : -Math.abs(numericValue);

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  if (categoryId) {
    const { data: category } = await supabase
      .from("skill_categories")
      .select("id")
      .eq("id", categoryId)
      .eq("teacher_id", userId)
      .single();

    if (!category) {
      redirect("/destrezas?error=category-not-found");
    }
  }

  const { data: existingSkill } = await supabase
    .from("skills")
    .select("id")
    .eq("teacher_id", userId)
    .ilike("name", name)
    .maybeSingle();

  if (existingSkill) {
    redirect("/destrezas?error=skill-duplicated");
  }

  const { error } = await supabase.from("skills").insert({
    category_id: categoryId || null,
    name,
    description: description || null,
    default_type: defaultType,
    default_value: defaultValue,
    color: color || (defaultType === "positive" ? "green" : "red"),
    icon: icon || (defaultType === "positive" ? "plus" : "minus"),
    is_active: true,
  });

  if (error) {
    console.error("Error creating skill:", error);
    redirect("/destrezas?error=skill-create-failed");
  }

  revalidatePath("/destrezas");
  redirect("/destrezas");
}

export async function toggleSkillActiveAction(formData: FormData) {
  const skillId = cleanText(formData.get("skillId"));
  const nextState = cleanText(formData.get("nextState"));

  if (!skillId) {
    redirect("/destrezas");
  }

  const isActive = nextState === "true";

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  const { error } = await supabase
    .from("skills")
    .update({
      is_active: isActive,
    })
    .eq("id", skillId)
    .eq("teacher_id", userId);

  if (error) {
    console.error("Error toggling skill:", error);
    redirect("/destrezas?error=skill-toggle-failed");
  }

  revalidatePath("/destrezas");
  redirect("/destrezas");
}

export async function deleteSkillCategoryAction(formData: FormData) {
  const categoryId = cleanText(formData.get("categoryId"));

  if (!categoryId) {
    redirect("/destrezas");
  }

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  const { data: linkedSkills, error: linkedError } = await supabase
    .from("skills")
    .select("id")
    .eq("teacher_id", userId)
    .eq("category_id", categoryId)
    .limit(1);

  if (linkedError) {
    console.error("Error checking linked skills:", linkedError);
    redirect("/destrezas?error=category-delete-failed");
  }

  if (linkedSkills && linkedSkills.length > 0) {
    redirect("/destrezas?error=category-has-skills");
  }

  const { error } = await supabase
    .from("skill_categories")
    .delete()
    .eq("id", categoryId)
    .eq("teacher_id", userId);

  if (error) {
    console.error("Error deleting category:", error);
    redirect("/destrezas?error=category-delete-failed");
  }

  revalidatePath("/destrezas");
  redirect("/destrezas");
}