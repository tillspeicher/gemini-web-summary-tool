import { browserAPI } from "../lib/browserAPI";

export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });

  registerContentScriptListener();
});

interface ApiRequest {
  action: string;
  url: string;
  method: string;
  data?: any;
}

function registerContentScriptListener() {
  console.log("Registering content script listener");
  browserAPI.runtime.onMessage.addListener(
    (
      request: ApiRequest,
      // sender: browserAPI.runtime.MessageSender,
      sender: any,
      sendResponse: (response?: any) => void,
    ) => {
      if (request.action === "makeApiCall") {
        fetch(request.url, {
          method: request.method,
          headers: {
            "Content-Type": "application/json",
          },
          body:
            request.method !== "GET" ? JSON.stringify(request.data) : undefined,
        })
          .then((response) => response.json())
          .then((data) => {
            sendResponse(data);
          })
          .catch((error: Error) => {
            console.log("error", error);
            sendResponse({ error: error.message });
          });
        return true; // Indicates that the response is sent asynchronously
      }
    },
  );
}
