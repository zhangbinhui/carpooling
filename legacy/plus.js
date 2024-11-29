addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // 检查URL路径，根据不同路径执行不同逻辑
    if (url.pathname === '/api/expirydate') {
        event.respondWith(handleExpiryDateRequest(event.request));
    } else {
        // 原有的请求处理逻辑
        event.respondWith(handleRequest(event.request));
    }
});

async function handleExpiryDateRequest(request) {
    const url = new URL(request.url);
    const userName = url.searchParams.get('un');
    const userJoined = await oai_global_variables.get("user_joined");
    if (userName && userJoined) {
        const userEntry = userJoined.split(',').find(entry => entry.startsWith(userName));
        if (userEntry) {
            const expiryDate = userEntry.split(':')[1];
            return new Response(JSON.stringify({ "expiryDate": expiryDate }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    return new Response(JSON.stringify({ "error": "User not found or missing parameter" }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
    });
}

function parseJwt(token) {
    const base64Url = token.split('.')[1]; // 获取载荷部分
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/'); // 将 Base64Url 转为 Base64
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload); // 返回载荷解析后的 JSON 对象
}

function isTokenExpired(token) {
    try {
        const payload = parseJwt(token);
        const currentTime = Math.floor(Date.now() / 1000); // 获取当前时间戳（秒）
        return payload.exp < currentTime; // 检查 token 是否过期
    } catch {
        return true;
    }
}

async function getOAuthLink(shareToken, proxiedDomain) {
    // const url = `https://${proxiedDomain}/api/auth/oauth_token`;
    // 不知道为什么，好像没法直接通过反代的服务器获取oauth link
    const url = `https://new.oaifree.com/api/auth/oauth_token`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Origin': `https://${proxiedDomain}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            share_token: shareToken
        })
    })
    const data = await response.json();
    return data.login_url;
}

async function getShareToken(userName, at) {
    const url = 'https://chat.oaifree.com/token/register';
    const body = new URLSearchParams({
        // 此处为获取Share Token时的请求参数，可自行配置
        access_token: at,
        unique_name: userName,
        site_limit: '', // 限制的网站
        expires_in: '0', // token有效期（单位为秒），填 0 则永久有效
        gpt35_limit: '-1', // gpt3.5 对话限制
        gpt4_limit: '-1', // gpt4 对话限制
        show_conversations: 'false', // 是否显示所有人的会话
        show_userinfo: 'false', // 是否显示用户信息
        reset_limit: 'false' // 是否重置对话限制
    }).toString();
    const apiResponse = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body
    });
    const responseText = await apiResponse.text();
    const tokenKeyMatch = /"token_key":"([^"]+)"/.exec(responseText);
    const tokenKey = tokenKeyMatch ? tokenKeyMatch[1] : 'share token 获取失败';
    return tokenKey;
}

const homePage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="apple-touch-icon" sizes="180x180" href="https://cdn1.oaifree.com/_next/static/media/apple-touch-icon.82af6fe1.png"/>
    <link rel="icon" type="image/png" sizes="32x32" href="https://cdn4.oaifree.com/_next/static/media/favicon-32x32.630a2b99.png"/>
    <link rel="icon" type="image/png" sizes="16x16" href="https://cdn4.oaifree.com/_next/static/media/favicon-16x16.a052137e.png"/>

    <title>{{carName}} 账号共享服务</title>
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 90vh;
            overflow: hidden;
        }
        h1{
            text-align: center;
        }
        p {
            display: block;
            margin-block-start: 1em;
            margin-block-end: 1em;
            margin-inline-start: 0px;
            margin-inline-end: 0px;
            unicode-bidi: isolate;
        }
        a {
            font-weight: 400;
            text-decoration: inherit;
            color: #10a37f;
        }
        input{
                appearance: none;
                -webkit-appearance: none;
                -moz-appearance: none;
                outline: none;
            }
        .input-wrapper {
            position: relative;
            margin-bottom: 20px;
        }

        .input-wrapper label {
            position: absolute;
            left: 10px;
            top: 14px;
            transition: 0.3s;
            color: #ccc;
            background-color: #ffffff;
        }

        .input-wrapper input {
            width: 274px;
            height: 52px;
            padding: 0 10px;
            border-radius: 5px;
            border: 1px solid #ccc;
            display: block;
            font-size: 16px;
        }
        .input-wrapper input:not(:placeholder-shown) {
            border-color: #0f9977 !important;
        }
        .input-wrapper input:focus {
            border-color: #0f9977 !important;
        }

        .input-wrapper input:focus + label,
        .input-wrapper input:not(:placeholder-shown) + label {
            top: -10px;
            left: 10px;
            font-size: 16px;
            color: #0f9977;
        }

        .other-page {
            text-align: center;
            margin-top: 16px;
            margin-bottom: 0;
            font-size: 14px;
            width: 320px;
        }

        .other-page-link {
            padding: 4px;
        }        

        .content-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: auto;
            white-space: normal;
            border-radius: 5px;
            position: relative;
            grid-area: center;
            box-shadow: none;
            vertical-align: baseline;
            box-sizing: content-box;
        }

        button {
            background-color: #0f9977;
            color: #ffffff;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            width: 295px !important;
            height: 52px;
        }

        @media (max-width: 768px) {
            body,
            form,
            .response-container {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div  class="content-wrapper">
        <h1>{{carName}}{{load}}人拼车</h1>
        <p class="other-page">当前车上有 <strong>{{userCount}}</strong> 人。</p>
        <p class="other-page">输入您的用户名以隔离他人的会话</p>
        <p/>
        <form action="/" method="POST">
            <div class="input-wrapper">
                <input type="text" id="usernameInput" name="un" placeholder=" " required minlength="6" oninput="updateDirectLink(); showExpiryDate();">
                <label for="un">用户名</label>
            </div>
            <p  class="other-page" id="expiryDatePrompt" style="display:none;">
                您的账号到期日为：<strong id="expiryDate"></strong>
                <br>
            </p>
            <p  class="other-page" id="directLinkPrompt" style="display:none;">上车后，也可通过👇直接访问 <br><a class="other-page-link href="#" id="directLinkUrl">这里</a><br><br></p>
            <div class="input-wrapper">
                <input type="text" name="ticket" placeholder=" ">
                <label for="ticket">车票</label>
            </div>
            <button type="submit">上车</button>
        </form>
    </div>
    <script>
		function updateDirectLink() {
			var input = document.getElementById('usernameInput');
			var prompt = document.getElementById('directLinkPrompt');
			var link = document.getElementById('directLinkUrl');
			if (input.value.length >= 6) {
                // 这里我们将直接使用从KV获取的car_name变量
                var baseUrl = '{{baseUrl}}';
				link.href = baseUrl + encodeURIComponent(input.value);
				link.textContent = baseUrl + encodeURIComponent(input.value);
				prompt.style.display = 'block';
			} else {
				prompt.style.display = 'none';
			}
		}

        // 添加一个新函数，用于获取和显示到期日期
        async function showExpiryDate() {
            const userName = document.getElementById('usernameInput').value;
            if (userName.length >= 6) {
                // 使用传统的字符串连接方法代替模板字符串
                const url = '/api/expirydate?un=' + encodeURIComponent(userName);
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    document.getElementById('expiryDate').textContent = data.expiryDate;
                    document.getElementById('expiryDatePrompt').style.display = 'block';
                } else {
                    console.error('Failed to fetch the expiry date');
                    // 处理错误，可能是显示一个错误消息
                }
            }
        }
    </script>
</body>
</html>`;

async function serveHTML(request, carName, userCount, baseUrl, load) {
    const formData = await request.formData();
    const userName = formData.get('un');
    const ticket = formData.get('ticket');

    // 动态生成首页 HTML，替换{{userCount}}占位符
    const dynamicHomePage = homePage
    .replace('{{carName}}', carName)
    .replace('{{carName}}', carName)
    .replace('{{userCount}}', userCount)
    .replace('{{baseUrl}}', baseUrl)
    .replace('{{load}}', load); // 替换占位符

    if (!userName) {
        return new Response(dynamicHomePage, {
            headers: {
                'Content-Type': 'text/html'
            }
        });
    } else {
        return handleUser(userName, ticket, dynamicHomePage, userCount, load);
    }
}


// 新增或更新用户要下车的时间
async function updateUserJoinTime(userName) {
    let userJoined = await oai_global_variables.get("user_joined");
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() + 3); // 加12个月
    const expirationDate = currentDate.toISOString().split('T')[0]; // 只获取日期部分

    const newUserJoined = `${userName}:${expirationDate}`;
    if (userJoined) {
        userJoined = `${userJoined},${newUserJoined}`;
    } else {
        userJoined = newUserJoined;
    }
    await oai_global_variables.put("user_joined", userJoined);
}



async function handleUser(userName, ticket, dynamicHomePage, userCount, load) {
    const users = await oai_global_variables.get("users");
    if (users.split(",").includes(userName)) {
        // Existing user logic
       return await getShareTokenAndLogin(userName);
    } else {
        // New user logic
        if (ticket) {
            if (userCount >= load) {
                return new Response(dynamicHomePage.replace('<label for="un">用户名</label>', '<label for="un">用户名</label><p  class="other-page">满载啦，等人下车才能上啦！</p>'), {
                    headers: {
                        'Content-Type': 'text/html'
                    }
                });
            }

            let tickets = await oai_global_variables.get("tickets");
            if (tickets) {
                tickets = tickets.split(",");

                const ticketIndex = tickets.indexOf(ticket);
                if (ticketIndex !== -1) {
                    // Remove used ticket
                    tickets.splice(ticketIndex, 1);
                    await oai_global_variables.put("tickets", tickets.join(","));
                    
                    // Add user to users list
                    let newUsersList = users ? `${users},${userName}` : userName; // 如果users不为空，则添加逗号和新用户名，否则只添加用户名
                    await oai_global_variables.put("users", newUsersList);

                    // Record user join time
                    await updateUserJoinTime(userName);

                    return await getShareTokenAndLogin(userName);
                } else {
                    return new Response(dynamicHomePage.replace('<label for="ticket">车票</label>', '<label for="ticket">车票</label><p  class="other-page">车票无效</p>'), {
                        headers: {
                            'Content-Type': 'text/html'
                        }
                    });
                }
            } else {
                return new Response(dynamicHomePage.replace('<label for="ticket">车票</label>', '<label for="ticket">车票</label><p  class="other-page">没有可用的车票</p>'), {
                    headers: {
                        'Content-Type': 'text/html'
                    }
                });
            }
        } else {
            return new Response(dynamicHomePage.replace('<label for="un">用户名</label>', '<label for="un">用户名</label><p  class="other-page">您当前不在车上，请输入车票再上车</p>'), {
                headers: {
                    'Content-Type': 'text/html'
                }
            });
        }
    }
}

async function getShareTokenAndLogin(userName){
    // @ts-ignore
    let accessToken = await oai_global_variables.get('at');
    console.log("Access Token Retrieved:", accessToken);

    if (isTokenExpired(accessToken)) {
        
        // 如果 Token 过期，执行获取新 Token 的逻辑
        console.log("Access Token is expired, attempting to refresh...");
        const url = 'https://token.oaifree.com/api/auth/refresh';
        
        const refreshToken = await oai_global_variables.get('rt');  // 实际情况下你可能会从某处获取这个值
        console.log("Refresh Token:", refreshToken);

        if (!refreshToken) {
            // 给没有refresh token的萌新用（比如我）
            console.log("No refresh token available.");
            return new Response('当前access token未更新，请联系管理员更新', { status: 401 });
        }
        

        // 发送 POST 请求
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
            },
            body: `refresh_token=${refreshToken}`
        });

        // 检查响应状态
        if (response.ok) {
            const data = await response.json();  // 假设服务器返回的是 JSON 格式数据
            accessToken  = data.access_token; // 直接从 JSON 中获取 access_token
            console.log("New Access Token Retrieved:", accessToken);

            await oai_global_variables.put('at', accessToken);
        } else {

            console.log("Failed to refresh token, HTTP Status:", response.status);
            return new Response('Error fetching access token', { status: response.status });
        }
    }

    const shareToken = await getShareToken(userName, accessToken);
    console.log("Share Token:", shareToken);


    if (shareToken === 'share token 获取失败') {
        console.log("Failed to retrieve share token.");
        return new Response('token获取失败，请刷新重试', { status: 500 });
    }

    // @ts-ignore
    const proxiedDomain = await oai_global_variables.get('proxied_domain');
    console.log("Proxied Domain:", proxiedDomain);

    const loginUrl = await getOAuthLink(shareToken, proxiedDomain);
    console.log("OAuth Link:", loginUrl);

    return Response.redirect(loginUrl, 302);

}


async function handleRequest(request) {

    const users = await oai_global_variables.get("users"); // 获取当前用户列表
    const userCount = users ? users.split(",").length : 0; // 计算用户数量
    const carName = await oai_global_variables.get("car_name"); // 从KV获取car_name变量
	const base_url = await oai_global_variables.get("base_url"); // base_url
    const baseUrl = `https://${base_url}/?un=`; // 使用car_name构造基础URL
    const load = parseInt(await oai_global_variables.get("load"), 10);

    const dynamicHomePage = homePage
	.replace('{{carName}}', carName)
    .replace('{{carName}}', carName)
    .replace('{{userCount}}', userCount)
    .replace('{{baseUrl}}', baseUrl)
    .replace('{{load}}', load); // 替换占位符


    if (request.method === 'GET') {
        const url = new URL(request.url);
        const userName = url.searchParams.get('un');

        if (!userName) {
            // 没有提交用户名，显示动态生成的首页
            return new Response(dynamicHomePage, {
                headers: {
                    'Content-Type': 'text/html'
                }
            });
        } else {
            //包含用户名
            return handleUser(userName, null, dynamicHomePage, userCount, load);
        }
    } else if (request.method === 'POST') {
        //提交表单，包含用户名和ticket
        return serveHTML(request , carName, userCount, baseUrl, load);
    }
}