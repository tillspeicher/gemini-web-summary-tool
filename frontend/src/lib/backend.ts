const HTTP_API_URL = "http://localhost:8000/api/v1"

export async function get<T>(path: string): Promise<T | null> {
    const url = `${HTTP_API_URL}/${path}`
    try {
        const response = await fetch(url)
        return response.json()
    } catch (error) {
        console.error("Failed to fetch", url, error)
        return null
    }
}

export async function post<T>(path: string, payload?: any): Promise<T | null> {
    const url = `${HTTP_API_URL}/${path}`
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: payload
                ? {
                      "Content-Type": "application/json",
                  }
                : undefined,
            body: payload ? JSON.stringify(payload) : undefined,
        })
        return response.json()
    } catch (error) {
        console.error("Failed to fetch", url, error)
        return null
    }
}
