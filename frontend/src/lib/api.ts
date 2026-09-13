import type { MasteryMap, MasteryRecord, Subject, Topic } from "./types";

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL as string | undefined
)?.replace(/\/$/, "");

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T | null> {
  if (!apiBaseUrl) return null;
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
    if (!response.ok) return null;
    if (response.status === 204) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function loadRemoteTopics(): Promise<Topic[] | null> {
  return request<Topic[]>("/topics");
}

export function createRemoteTopic(topic: Topic): Promise<Topic | null> {
  return request<Topic>("/topics", {
    method: "POST",
    body: JSON.stringify(topic),
  });
}

export function updateRemoteTopic(topic: Topic): Promise<Topic | null> {
  return request<Topic>(`/topics/${encodeURIComponent(topic.id)}`, {
    method: "PUT",
    body: JSON.stringify(topic),
  });
}

export function deleteRemoteTopic(topicId: string): Promise<null> {
  return request<null>(`/topics/${encodeURIComponent(topicId)}`, {
    method: "DELETE",
  });
}

export function loadRemoteSubjects(): Promise<Subject[] | null> {
  return request<Subject[]>("/subjects");
}

export function createRemoteSubject(subject: Subject): Promise<Subject | null> {
  return request<Subject>("/subjects", {
    method: "POST",
    body: JSON.stringify(subject),
  });
}

export function loadRemoteMastery(): Promise<MasteryMap | null> {
  return request<MasteryMap>("/mastery");
}

export function saveRemoteMastery(
  topicId: string,
  questionId: string,
  record: MasteryRecord,
): Promise<MasteryRecord | null> {
  return request<MasteryRecord>(
    `/mastery/${encodeURIComponent(topicId)}/${encodeURIComponent(questionId)}`,
    { method: "PUT", body: JSON.stringify(record) },
  );
}
