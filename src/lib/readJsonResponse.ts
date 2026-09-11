type JsonObject = Record<string, any>;

/**
 * Read an API response exactly once and turn non-JSON/empty responses into a
 * normal error object instead of leaking the browser's Response.json error.
 */
export async function readJsonResponse<T extends JsonObject = JsonObject>(response: Response): Promise<T> {
  let raw = '';

  try {
    raw = await response.text();
  } catch {
    return {
      error: `Không thể đọc phản hồi từ máy chủ (HTTP ${response.status}).`
    } as unknown as T;
  }

  if (!raw.trim()) {
    return {
      error: `Máy chủ trả về phản hồi rỗng (HTTP ${response.status}).`
    } as unknown as T;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return {
      error: `Máy chủ trả về phản hồi không hợp lệ (HTTP ${response.status}).`
    } as unknown as T;
  }
}
