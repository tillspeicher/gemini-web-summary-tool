// import { browserAPI } from "../../../lib/browserAPI";

interface ApiCallParams {
    url_postfix: string
    method: string
    data: any
}

const API_URL = "http://localhost:8000/api/v1"

// API call function
export function makeApiCall({
    url_postfix,
    method,
    data,
}: ApiCallParams): Promise<any> {
    return new Promise((resolve, reject) => {
        const url = `${API_URL}${url_postfix}`
        // browserAPI.runtime.sendMessage(
        chrome.runtime.sendMessage(
            {
                action: "makeApiCall",
                url,
                method,
                data,
            },
            (response: any) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError)
                } else {
                    resolve(response)
                }
            },
        )
    })
}
