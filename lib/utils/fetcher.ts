// @/lib/utils/fetcher.ts
// fetch 封装

/**
 * 封装的 fetch 工具函数，支持 JSON 请求和响应处理。
 * @param url 请求 URL
 * @param config fetch 配置，包括 method, headers, body 等
 * @returns Promise<T> 返回解析后的 JSON 数据
 */
export async function fetcher<T>(
    url: string,
    config?: Omit<RequestInit, 'body'> & { body?: object } // 修改这里
): Promise<T> {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(config?.headers || {}),
    };

    // 处理 body，如果是对象就序列化
    const body = config?.body ? JSON.stringify(config.body) : undefined;

    const response = await fetch(url, {
        ...config,
        headers,
        body, // 使用处理后的 body
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.error || errorData.message || `HTTP error! Status: ${response.status}`);
    }

    return response.json();
}