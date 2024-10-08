function checkContentForModeration(r, messages) {
    const url = "https://one-api.aiporters.com/v1/moderations";
    const body = JSON.stringify({ input: messages });
    const headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer sk-2rt8RBivi5oLUSxK0fD0048f3d87435fB47eFe9c9b139eFe"
    };

    fetch(url, {
        method: 'POST',
        headers: headers,
        body: body
    })
    .then(res => {
        if (res.ok) {
            return res.json();
        } else {
            r.error("API responded with non-200 status: " + res.status);
            throw new Error("API error: " + res.status);
        }
    })
    .then(data => {
        r.log("Moderation API response: " + JSON.stringify(data));
        if (data.results && data.results[0] && data.results[0].flagged) {
            r.error("Content flagged; blocking request.");
            r.return(451, JSON.stringify({ detail: "您的消息包含不当内容，发车不易，请修改后重试!" }));
        } else {
            r.log("No issues found; proxying request.");
        }
    })
    .catch(err => {
        r.error("Failed to call moderation API: " + err);
        // 根据需要决定是否阻止请求
    });
}

function processRequest(r) {
    r.log("Processing request...");

    if (r.method !== "POST" && r.method !== "PUT") {
        r.log("Request method is not POST or PUT, skipping body read.");
        return;
    }

    let body = '';

    r.on('requestBody', (chunk, flags) => {
        body += chunk;
    });

    r.on('requestBodyDone', () => {
        if (!body) {
            r.error("Failed to read request body or no body present.");
            return;
        }

        r.log("Request body: " + body);

        let data;
        try {
            data = JSON.parse(body);
        } catch (e) {
            r.error("Failed to decode JSON: " + e);
            return;
        }

        if (!data.messages || !Array.isArray(data.messages)) {
            r.error("No valid messages to process.");
            return;
        }

        let messages = [];
        data.messages.forEach(msg => {
            if (msg.author && msg.author.role === "user" && msg.content && msg.content.content_type === "text") {
                messages.push(msg.content.parts.join(" "));
            }
        });

        r.log("Collected messages for moderation: " + JSON.stringify(messages));

        if (messages.length > 0) {
            checkContentForModeration(r, messages);
        } else {
            r.log("No messages to process; proxying request.");
        }
    });
}

export default { processRequest };