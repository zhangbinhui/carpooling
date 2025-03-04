addEventListener('fetch', event => {
    const url = new URL(event.request.url);
  
    // Check the URL path, handle '/api/expirydate' separately
    if (url.pathname === '/api/expirydate') {
        event.respondWith(handleExpiryDateRequest(event.request));
    } else {
        // Handle other requests
        event.respondWith(handleRequest(event.request));
    }
  });
  
  async function updateStationData() {
      const [load, carName, users, userGetOff, baseUrl] = await Promise.all([
          claude_global_variables.get('load'),
          claude_global_variables.get('car_name'),
          claude_global_variables.get('users'),
          claude_global_variables.get('user_earliest_get_off_date'),
          claude_global_variables.get('base_url')
      ]);
  
      const userCount = users ? users.split(',').length : 0;
      const userGetOffDisplay = userGetOff || '暂无';
  
      // 从 baseUrl 中提取 vehicleName
      const vehicleName = baseUrl.split('.')[0];
  
      const summaryData = {
          load,
          carName,
          userCount,
          userGetOff: userGetOffDisplay,
          baseUrl
      };
  
      await stationDataKV.put(vehicleName, JSON.stringify(summaryData));
  }
  
  
  async function handleExpiryDateRequest(request) {
    const url = new URL(request.url);
    const userName = url.searchParams.get('un');
    const userJoined = await claude_global_variables.get("user_joined");
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
  
  function getEarliestGetOffDate(userJoined) {
    let earliestDateStr = null;
    if (userJoined) {
        const entries = userJoined.split(',');
        for (let entry of entries) {
            const [userName, dateStr] = entry.split(':');
            if (dateStr) {
                if (!earliestDateStr || dateStr < earliestDateStr) {
                    earliestDateStr = dateStr;
                }
            }
        }
    }
    if (earliestDateStr) {
        return earliestDateStr;
    } else {
        return '暂无'; // Or your preferred default message
    }
  }
  
  async function updateUserJoinTime(userName) {
    let userJoined = await claude_global_variables.get("user_joined");
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() + 1); // Add 1 month
    const expirationDate = currentDate.toISOString().split('T')[0]; // Get date part
  
    const newUserJoined = `${userName}:${expirationDate}`;
    if (userJoined) {
        userJoined = `${userJoined},${newUserJoined}`;
    } else {
        userJoined = newUserJoined;
    }
    await claude_global_variables.put("user_joined", userJoined);
  
    // 重新计算最近下车时间
    const earliestDateStr = getEarliestGetOffDate(userJoined);
    await claude_global_variables.put("user_earliest_get_off_date", earliestDateStr);
  }
  
  const homePage = `<!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{carName}} Claude账号共享</title>
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
    <div class="content-wrapper">
        <h1>{{carName}}{{load}}人拼车</h1>
        <p class="other-page">当前车上有 <strong>{{userCount}}</strong> 人。</p>
        <p class="other-page">最近一个用户的下车时间：<strong>{{userGetOff}}</strong></p>
        <p class="other-page">输入您的用户名以隔离他人的会话</p>
        <p/>
        <form action="/" method="POST">
            <div class="input-wrapper">
                <input type="text" id="usernameInput" name="un" placeholder=" " required minlength="6" autofocus oninput="updateDirectLink(); showExpiryDate();">
                <label for="un">用户名</label>
            </div>
            <p class="other-page" id="expiryDatePrompt" style="display:none;">
                您的账号到期日为：<strong id="expiryDate"></strong>
                <br>
            </p>
            <p class="other-page" id="errorPrompt" style="display:none; color: red;"></p>
            <p class="other-page" id="directLinkPrompt" style="display:none;">上车后，也可通过👇直接访问 <br><a class="other-page-link" href="#" id="directLinkUrl">这里</a><br><br></p>
            <div class="input-wrapper" id="ticketInputWrapper">
                <input type="text" name="ticket" placeholder=" ">
                <label for="ticket">车票</label>
            </div>
            <button type="submit">上车</button>
            <p class="other-page">没有车票？👉
            <a class="other-page-link" href="https://smallshop.wehugai.com/buy/11" target="_blank">去买一张</a>
            </p>
            <p class="other-page">这是什么？👉
                <a class="other-page-link" href="https://home.aiporters.com/productivity/plus.html" target="_blank">看看介绍</a>
            </p>
        </form>
    </div>
    <script>
    function updateDirectLink() {
      var input = document.getElementById('usernameInput');
      var prompt = document.getElementById('directLinkPrompt');
      var link = document.getElementById('directLinkUrl');
      if (input.value.length >= 6) {
        var baseUrl = '{{baseUrl}}';
        link.href = baseUrl + encodeURIComponent(input.value);
        link.textContent = baseUrl + encodeURIComponent(input.value);
        prompt.style.display = 'block';
      } else {
        prompt.style.display = 'none';
      }
    }
  
    async function showExpiryDate() {
        const userName = document.getElementById('usernameInput').value;
        const ticketInputWrapper = document.getElementById('ticketInputWrapper');
        const expiryDatePrompt = document.getElementById('expiryDatePrompt');
        const errorPrompt = document.getElementById('errorPrompt');
  
        if (userName.length >= 6) {
            const url = '/api/expirydate?un=' + encodeURIComponent(userName);
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    document.getElementById('expiryDate').textContent = data.expiryDate;
                    expiryDatePrompt.style.display = 'block';
                    // 隐藏车票输入框
                    ticketInputWrapper.style.display = 'none';
                    // 隐藏错误提示
                    errorPrompt.style.display = 'none';
                } else {
                    // 用户未找到
                    expiryDatePrompt.style.display = 'none';
                    ticketInputWrapper.style.display = 'block';
                    errorPrompt.style.display = 'none';
                }
            } catch (error) {
                console.error('Failed to fetch the expiry date', error);
                expiryDatePrompt.style.display = 'none';
                ticketInputWrapper.style.display = 'block';
                errorPrompt.style.display = 'block';
                errorPrompt.textContent = '网络错误，请稍后重试';
            }
        } else {
            // 用户名长度不足
            expiryDatePrompt.style.display = 'none';
            ticketInputWrapper.style.display = 'block';
            errorPrompt.style.display = 'none';
        }
    }
    </script>
  </body>
  </html>
  `;
  
  async function serveHTML(request, carName, userCount, baseUrl, load, userGetOff) {
    const formData = await request.formData();
    const userName = formData.get('un');
    const ticket = formData.get('ticket');
  
    // Generate dynamic home page
    const dynamicHomePage = homePage
    .replace('{{carName}}', carName)
    .replace('{{carName}}', carName)
    .replace('{{userCount}}', userCount)
    .replace('{{baseUrl}}', baseUrl)
    .replace('{{load}}', load)
    .replace('{{userGetOff}}', userGetOff);
  
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
  
  async function handleUser(userName, ticket, dynamicHomePage, userCount, load) {
    const users = await claude_global_variables.get("users");
    if (users && users.split(",").includes(userName)) {
        // Existing user
        return await getShareTokenAndLogin(userName);
    } else {
        // New user
        if (ticket) {
            if (userCount >= load) {
                return new Response(dynamicHomePage.replace('<label for="un">用户名</label>', '<label for="un">用户名</label><p class="other-page">满载啦，等人下车才能上啦！</p>'), {
                    headers: {
                        'Content-Type': 'text/html'
                    }
                });
            }
  
            let tickets = await claude_global_variables.get("tickets");
            if (tickets) {
                tickets = tickets.split(",");
  
                const ticketIndex = tickets.indexOf(ticket);
                if (ticketIndex !== -1) {
                    // Remove used ticket
                    tickets.splice(ticketIndex, 1);
                    await claude_global_variables.put("tickets", tickets.join(","));
                    
                    // Add user to users list
                    let newUsersList = users ? `${users},${userName}` : userName;
                    await claude_global_variables.put("users", newUsersList);
  
                    // Record user join time
                    await updateUserJoinTime(userName);
  
                    // 更新车站数据
                    await updateStationData();
  
                    return await getShareTokenAndLogin(userName);
                } else {
                    return new Response(dynamicHomePage.replace('<label for="ticket">车票</label>', '<label for="ticket">车票</label><p class="other-page">车票无效</p>'), {
                        headers: {
                            'Content-Type': 'text/html'
                        }
                    });
                }
            } else {
                return new Response(dynamicHomePage.replace('<label for="ticket">车票</label>', '<label for="ticket">车票</label><p class="other-page">没有可用的车票</p>'), {
                    headers: {
                        'Content-Type': 'text/html'
                    }
                });
            }
        } else {
            return new Response(dynamicHomePage.replace(
              '<label for="un">用户名</label>', 
              '<label for="un">用户名</label><p class="other-page">您当前不在车上，请输入车票再上车</p>'), {
                headers: {
                    'Content-Type': 'text/html'
                }
            });
        }
    }
  }
  
  async function getShareToken(userName, sessionKey) {
    const proxiedDomain = await claude_global_variables.get('proxied_domain');
    const url = `https://${proxiedDomain}/manage-api/auth/oauth_token`;
  
    const body = {
        session_key: sessionKey,
        unique_name: userName,
        expires_in: 36000
    };
  
    const apiResponse = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
  
    const data = await apiResponse.json();
    if (data.login_url && data.oauth_token) {
        const loginUrl = `https://${proxiedDomain}${data.login_url}`;
        const oauthToken = data.oauth_token;
        return { loginUrl, oauthToken };
    } else if (data.oauth_token) {
        // Construct loginUrl manually if login_url is not provided
        const oauthToken = data.oauth_token;
        const loginUrl = `https://${proxiedDomain}/login_oauth?token=${oauthToken}`;
        return { loginUrl, oauthToken };
    }  else {
        return null; // Handle error appropriately
    }
  }
  
  async function getShareTokenAndLogin(userName) {
    const sessionKey = await claude_global_variables.get('session_key');
    console.log("Session Key Retrieved:", sessionKey);
  
    // Assume sessionKey is valid; add expiration logic if necessary
  
    // Get the share token and login URL
    const shareTokenData = await getShareToken(userName, sessionKey);
    if (!shareTokenData) {
        console.log("Failed to retrieve share token and login URL.");
        return new Response('Failed to retrieve share token and login URL. Please try again later.', { status: 500 });
    }
  
    const { loginUrl, oauthToken } = shareTokenData;
    console.log("Login URL:", loginUrl);
  
    // Temporarily display the loginUrl and oauthToken on the page
    // return new Response(`
    // <html>
    //     <body>
    //     <p>Login URL: <a href="${loginUrl}">${loginUrl}</a></p>
    //     <p>OAuth Token: ${oauthToken}</p>
    //     </body>
    // </html>
    // `, {
    //     headers: { 'Content-Type': 'text/html' }
    // });
  
    // Redirect the user to the login URL
    return Response.redirect(loginUrl, 302);
  }
  
  async function handleRequest(request) {
  
      const [
          users,
          carName,
          base_url,
          loadStr,
          userJoined,
          userGetOffValue
      ] = await Promise.all([
          claude_global_variables.get("users"),
          claude_global_variables.get("car_name"),
          claude_global_variables.get("base_url"),
          claude_global_variables.get("load"),
          claude_global_variables.get("user_joined"),
          claude_global_variables.get('user_earliest_get_off_date')
      ]);
      
      const userCount = users ? users.split(",").length : 0;
      const baseUrl = `https://${base_url}/?un=`;
      const load = parseInt(loadStr, 10);
      const userGetOff = userGetOffValue || '暂无下车时间';
      
  
    const dynamicHomePage = homePage
    .replace('{{carName}}', carName)
    .replace('{{carName}}', carName)
    .replace('{{userCount}}', userCount)
    .replace('{{baseUrl}}', baseUrl)
    .replace('{{load}}', load)
    .replace('{{userGetOff}}', userGetOff);
  
    if (request.method === 'GET') {
        const url = new URL(request.url);
        const userName = url.searchParams.get('un');
  
        if (!userName) {
            // No username provided, show the home page
            return new Response(dynamicHomePage, {
                headers: {
                    'Content-Type': 'text/html'
                }
            });
        } else {
            // Username provided
            return handleUser(userName, null, dynamicHomePage, userCount, load);
        }
    } else if (request.method === 'POST') {
        // Form submission
        return serveHTML(request, carName, userCount, baseUrl, load, userGetOff);
    }
  }
  