type StudentAvatarData = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_key: string | null;
};

const AVATAR_BACKGROUND_COLORS =
  "b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf";

export function getStudentAvatarSeed(student: StudentAvatarData) {
  const avatarKey = student.avatar_key?.trim();

  if (avatarKey) {
    return avatarKey;
  }

  return `miniavs-${student.id}-1`;
}

export function getStudentAvatarUrlFromSeed(seed: string) {
  const encodedSeed = encodeURIComponent(seed);

  return `https://api.dicebear.com/10.x/miniavs/svg?seed=${encodedSeed}&backgroundColor=${AVATAR_BACKGROUND_COLORS}`;
}

export function getStudentAvatarUrl(student: StudentAvatarData) {
  return getStudentAvatarUrlFromSeed(getStudentAvatarSeed(student));
}

export function getStudentAvatarOptions(studentId: string, total = 8) {
  return Array.from({ length: total }, (_, index) => {
    const seed = `miniavs-${studentId}-${index + 1}`;

    return {
      key: seed,
      url: getStudentAvatarUrlFromSeed(seed),
    };
  });
}