type ApiErrorBody = { code?: string; message?: string };

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { Accept: 'application/json', ...init?.headers },
    });
  } catch {
    throw new Error('백엔드 서버에 연결할 수 없습니다. 서버 실행 상태를 확인해 주세요.');
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      throw new Error('서버 응답을 읽을 수 없습니다.');
    }
  }

  if (!response.ok) {
    const error = payload as ApiErrorBody | null;
    throw new ApiRequestError(
      response.status,
      error?.message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      error?.code,
    );
  }
  return payload as T;
}
