import { ChecklistFormPayload } from '../types/checklist';

const API_URL = process.env.EXPO_PUBLIC_SYNC_API_URL || 'https://httpbin.org/post';

interface ApiResponseLike {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
}

export const postChecklist = async (payload: ChecklistFormPayload): Promise<void> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      submittedAt: new Date().toISOString(),
    }),
  });

  const text = await response.text();
  let parsed: ApiResponseLike | null = null;

  try {
    parsed = text ? (JSON.parse(text) as ApiResponseLike) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    throw new Error(parsed?.error || `HTTP ${response.status}`);
  }

  if (parsed && parsed.ok === false) {
    throw new Error(parsed.error || 'API rejected submission');
  }
};
