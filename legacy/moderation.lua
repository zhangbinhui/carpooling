local cjson = require "cjson"
local http = require "resty.http"

local function checkContentForModeration(messages)
    local httpc = http.new()
    httpc:set_timeout(5000)  -- 设置超时为5000毫秒

    local resp, err = httpc:request_uri("https://one-api.aiporters.com/v1/moderations", {
        method = "POST",
        body = cjson.encode({input = messages}),
        headers = {
            ["Content-Type"] = "application/json",
            ["Authorization"] = "Bearer sk-2rt8RBivi5oLUSxK0fD0048f3d87435fB47eFe9c9b139eFe",
        },
        ssl_verify = false  
    })

    if not resp then
        ngx.log(ngx.ERR, "Failed to call moderation API: ", err or "unknown error")
        return false
    end

    ngx.log(ngx.INFO, "Moderation API response status: ", resp.status)

    if resp.status == 200 then
        local data = cjson.decode(resp.body)
        ngx.log(ngx.INFO, "Moderation API response body: " .. resp.body)
        return data.results and data.results[1] and data.results[1].flagged
    else
        ngx.log(ngx.ERR, "API responded with non-200 status: ", resp.status)
        return false
    end
end

local function process_request(ngx)
    ngx.log(ngx.INFO, "Processing request...")

    if ngx.req.get_method() ~= "POST" and ngx.req.get_method() ~= "PUT" then
        ngx.log(ngx.INFO, "Request method is not POST or PUT, skipping body read.")
        return
    end

    ngx.req.read_body()
    local body = ngx.req.get_body_data()

    if not body then
        ngx.log(ngx.ERR, "Failed to read request body or no body present.")
        return
    end

    ngx.log(ngx.INFO, "Request body: " .. body)

    local data, err = cjson.decode(body)
    if not data then
        ngx.log(ngx.ERR, "Failed to decode JSON: ", err)
        return
    end

    if not data.messages or type(data.messages) ~= "table" then
        ngx.log(ngx.ERR, "No valid messages to process.")
        return
    end

    local messages = {}
    for _, msg in ipairs(data.messages) do
        if msg.author.role == "user" and msg.content.content_type == "text" then
            table.insert(messages, table.concat(msg.content.parts, " "))
        end
    end

    ngx.log(ngx.INFO, "Collected messages for moderation: ", cjson.encode(messages))

    if #messages > 0 then
        local shouldBlock = checkContentForModeration(messages)
        if shouldBlock then
            ngx.log(ngx.ERR, "Content flagged; blocking request.")
            ngx.status = 451
            ngx.header.content_type = "application/json"
            ngx.say(cjson.encode({detail = "您的消息包含不当内容，发车不易，请修改后重试!"}))
            ngx.exit(ngx.HTTP_FORBIDDEN)
        else
            ngx.log(ngx.INFO, "No issues found; proxying request.")
        end
    else
        ngx.log(ngx.INFO, "No messages to process; proxying request.")
    end
end

process_request(ngx)