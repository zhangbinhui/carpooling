addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});


    const vehicleNames = [
        'meimeituan',
        'hahaluo',
        'qingqingju',
        'meituantuan',
        'haluoluo',
        'qingjuju',
        'haidao',
        'haifeng',
        'haitan',
        'haigui',
        'haidai',
        'haitai',
        'hailuo',
        'haixing',
        'haidan',
        'haibao',
        'haima',
        'haiou', 
        'haishi', 
        'haitun', 
        'haixiang', 
        'haiwangpro',
        'haishenpro',
        'haicaopro',
        'haixingpro',
        'haidaopro',
        'haifengpro',
        'haitanpro',
        'haiguipro',
        'haidaipro',
        'haibaopro', 
        'haimapro',
        'haioupro', 
        'haishipro', 
        'haitunpro',
        'haixiangpro'
    ];
  
    // 定义专车列表
    const vipVehicleList = [
        'haiwangpro',
        'haishenpro',
        'haicaopro',
        'haixingpro'
    ];

    // 定义共享单车列表
    const bikeVehicleList = [
        'meimeituan',
        'hahaluo',
        'qingqingju',
        'meituantuan',
        'haluoluo',
        'qingjuju'
    ];

    async function handleRequest(request) {
        const url = new URL(request.url);

        // 处理订阅请求
        if (url.pathname === '/api/subscribe') {
            return handleSubscribe(request);
        }
        
        // 处理退订请求
        if (url.pathname === '/unsubscribe') {
            return handleUnsubscribe(request);
        }
        
        // 检查cookie，延长验证有效期到4小时
        const cookie = request.headers.get('Cookie') || '';
        if (cookie.includes('turnstile_verified=true')) {
            return handleStationRequest(request);
        }
    
        // 处理验证提交
        if (request.method === 'POST') {
            const formData = await request.formData();
            const token = formData.get('cf-turnstile-response');
            
            if (token) {
                const verified = await verifyTurnstileToken(token);
                if (verified) {
                    const hostname = request.headers.get('X-Original-Host') || url.hostname;
                    return new Response(null, {
                        status: 302,
                        headers: {
                            'Location': `https://${hostname}/`,
                            'Set-Cookie': 'turnstile_verified=true; path=/; max-age=14400', // 4小时
                            'Cache-Control': 'no-store'
                        }
                    });
                }
            }
            
            return new Response('验证失败', { 
                status: 400,
                headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
            });
        }
    
        // 显示简化的验证页面
        return new Response(`
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>验证 - AI公益车站</title>
                <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
                <style>
                    body {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        margin: 0;
                        background-color: #f9f9f9;
                        font-family: Arial, sans-serif;
                    }
                    .container {
                        background: white;
                        padding: 2rem;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        text-align: center;
                    }
                    h1 {
                        color: #333;
                        margin-bottom: 1.5rem;
                    }
                    .logo { max-width: 200px; margin-bottom: 1rem; }
                    button {
                        background: #0f9977;
                        color: white;
                        border: none;
                        padding: 0.8rem 1.5rem;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 1rem;
                        margin-top: 1rem;
                    }
                    button:disabled { opacity: 0.7; }
                </style>
            </head>
            <body>
                <div class="container">
                    <img src="https://wehugai.com/images/qms.png" alt="Logo" class="logo">
                    <h1>欢迎访问AI公益车站</h1>
                    <form method="POST">
                        <div class="cf-turnstile" 
                             data-sitekey="0x4AAAAAAA3FbJGll9BNZHlU"
                             data-callback="enableButton"></div>
                        <button type="submit" id="submit-btn" disabled>请完成验证</button>
                    </form>
                </div>
                <script>
                    function enableButton() {
                        document.getElementById('submit-btn').disabled = false;
                        document.getElementById('submit-btn').textContent = '进入站点';
                    }
                </script>
            </body>
            </html>
        `, {
            headers: { 
                'Content-Type': 'text/html;charset=UTF-8',
                'Cache-Control': 'no-store'
            }
        });
    }
    
    async function verifyTurnstileToken(token) {
        try {
            const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    secret: '0x4AAAAAAA3FbDGiMDnfYyQ5e888TWDrVQ4',
                    response: token
                })
            });
            const data = await response.json();
            return data.success === true;
        } catch {
            return false;
        }
    }

    // 2. 订阅处理函数
    async function handleSubscribe(request) {
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        try {
            const { email } = await request.json();
            
            // 验证邮箱格式
            if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                return new Response(JSON.stringify({ error: '请输入有效的邮箱地址' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 检查是否已订阅
            const existingSubscription = await proSubscribersKV.get(email);
            if (existingSubscription) {
                return new Response(JSON.stringify({ error: '该邮箱已订阅' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 生成退订 token
            const unsubscribeToken = crypto.randomUUID();
            
            // 存储订阅信息
            await proSubscribersKV.put(email, JSON.stringify({
                subscribeTime: new Date().toISOString(),
                unsubscribeToken
            }));

            console.log('KV put done, call sendSubscriptionConfirmation now');
            // 发送确认订阅邮件
            await sendSubscriptionConfirmation(email, unsubscribeToken);
            console.log('sendSubscriptionConfirmation finished');

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('Subscription error:', error);
            return new Response(JSON.stringify({ error: '订阅失败，请稍后重试' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 3. 退订处理函数
    async function handleUnsubscribe(request) {
        const url = new URL(request.url);
        const email = url.searchParams.get('email');
        const token = url.searchParams.get('token');

        if (!email || !token) {
            return new Response('无效的退订链接', { status: 400 });
        }

        try {
            const subscription = await proSubscribersKV.get(email, 'json');
            if (!subscription || subscription.unsubscribeToken !== token) {
                return new Response('无效的退订链接', { status: 400 });
            }

            // 删除订阅
            await proSubscribersKV.delete(email);

            // 返回退订成功页面
            return new Response(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>退订成功</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            text-align: center;
                            padding: 40px 20px;
                            line-height: 1.6;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                        }
                        h1 { color: #333; }
                        a { color: #0f9977; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>退订成功</h1>
                        <p>您已成功退订 Pro 车位提醒服务</p>
                        <p>如果您改变主意，随时可以在 <a href="/">车站首页</a> 重新订阅</p>
                    </div>
                </body>
                </html>
            `, {
                headers: { 'Content-Type': 'text/html;charset=UTF-8' }
            });
        } catch (error) {
            console.error('Unsubscribe error:', error);
            return new Response('退订处理失败，请稍后重试', { status: 500 });
        }
    }

    // 4. 邮件发送服务
    async function sendSubscriptionConfirmation(email, unsubscribeToken) {
        console.log('sendSubscriptionConfirmation start:', email, unsubscribeToken);
        const emailContent = `
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .button {
                        background-color: #0f9977;
                        color: white;
                        padding: 10px 20px;
                        text-decoration: none;
                        border-radius: 4px;
                        display: inline-block;
                    }
                    .footer {
                        margin-top: 20px;
                        font-size: 12px;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>订阅确认</h2>
                    <p>您已成功订阅 AI公益车站 的 Pro 车位提醒服务。</p>
                    <p>当有新的 Pro 车位空出时，我们会第一时间通知您。</p>
                    <div class="footer">
                        <p>如果想要退订此服务，请<a href="https://station.aiporters.com/unsubscribe?email=${encodeURIComponent(email)}&token=${unsubscribeToken}">点击这里</a></p>
                    </div>
                </div>
            </body>
            </html>
        `;

        try {
            await sendEmailViaAliyunWorker({
              to: email,
              subject: 'Pro 车位提醒服务订阅确认',
              html: emailContent
            });
          } catch (error) {
            console.error('Failed to send subscription confirmation:', error);
          }
    }

    async function sendEmailViaAliyunWorker({ to, subject, html }) {
        console.log('sendEmailViaAliyunWorker invoked with:', { to, subject });
        try {
          // 1. 向我们新的发邮件 Worker 发 POST
          const res = await fetch('https://aliyun-email-sender.wehugai.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, subject, html })
          });
      
          // 2. 解析返回
          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Email worker responded with ${res.status}: ${errText}`);
          }
      
          const result = await res.json();
          if (result.error) {
            throw new Error(`Email worker error: ${result.error}`);
          }
      
          // result.success === true
          console.log('Email sent successfully via external worker:', result);
        } catch (err) {
          console.error('Failed to send email via external worker:', err);
        }
    }
      

  
    async function handleStationRequest(request) {
        const url = new URL(request.url);
        const hostname = request.headers.get('X-Original-Host') || url.hostname;
    
        // 获取所有车辆的数据
        const vehicleDataPromises = vehicleNames.map(async name => {
            const data = await stationDataKV.get(name);
            if (data) {
                const vehicleData = JSON.parse(data);
                vehicleData.url = `https://${vehicleData.baseUrl}`; // 使用存储的 baseUrl
                vehicleData.name = name;

                // 计算空闲座位数
                vehicleData.availableSeats = parseInt(vehicleData.load) - vehicleData.userCount;

                return vehicleData;
            }
            return null;
        });
    
        const vehicleDataArray = await Promise.all(vehicleDataPromises);

        // 对每种类型的车辆分别进行排序
        const sortByAvailableSeats = (vehicles) => {
            return vehicles.sort((a, b) => {
                // 首先按照空闲座位数排序（从大到小）
                const seatsComparison = b.availableSeats - a.availableSeats;
                if (seatsComparison !== 0) return seatsComparison;
                
                // 如果空闲座位数相同，按照总座位数排序（从大到小）
                return parseInt(a.load) - parseInt(b.load);
            });
        };
    
        // 将车辆分为四类：共享单车、公益车、pro拼车和pro专车，并且将车辆分类并排序
        const bikeVehicles = sortByAvailableSeats(
            vehicleDataArray.filter(v => v && bikeVehicleList.includes(v.name))
        );
        const publicVehicles = sortByAvailableSeats(
            vehicleDataArray.filter(v => v && 
            !v.name.endsWith('pro') && !bikeVehicleList.includes(v.name))
        );
        const proVehicles = sortByAvailableSeats(
            vehicleDataArray.filter(v => v && 
            v.name.endsWith('pro') && !vipVehicleList.includes(v.name))
        );
        const vipVehicles = sortByAvailableSeats(
            vehicleDataArray.filter(v => v && 
            vipVehicleList.includes(v.name))
        );
    
        // 根据主机名确定默认选项卡
        const defaultTab = hostname.endsWith('.top') ? 'public' : 'pro';
        const bikeClaudeActive = defaultTab === 'bike' ? 'active' : '';
        const publicClaudeActive = defaultTab === 'public' ? 'active' : '';
        const proClaudeActive = defaultTab === 'pro' ? 'active' : '';
        const vipClaudeActive = defaultTab === 'vip' ? 'active' : '';
    
        const stationPage = `
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <!-- 添加 iconfont 样式链接，这个链接需要替换成你自己的 -->
                <link rel="stylesheet" href="https://at.alicdn.com/t/c/font_4792180_ivqtqb8zgk.css">
                <title>AI公益车站</title>
                <style>
                    body {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background-color: #f9f9f9;
                        font-family: Arial, sans-serif;
                    }
                    h1 {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    .tab-container {
                        width: 100%;
                        max-width: 1200px;
                    }
                    .tabs {
                        display: flex;
                        justify-content: center;
                        margin-bottom: 20px;
                    }
                    .tab {
                        padding: 10px 20px;
                        cursor: pointer;
                        background-color: #ffffff;
                        border: 1px solid #ddd;
                        border-bottom: none;
                        margin: 0 5px;
                        border-radius: 8px 8px 0 0;
                        font-weight: bold;
                    }
                    .tab.active {
                        background-color: #0f9977;
                        color: #ffffff;
                    }
                    .tab-content {
                        display: none;
                    }
                    .tab-content.active {
                        display: block;
                    }
                    .car-container {
                        display: flex;
                        flex-wrap: wrap;
                        justify-content: center;
                        gap: 20px;
                        padding: 0 10px;
                    }
                    .car-card {
                        background-color: #ffffff;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        padding: 20px;
                        width: 250px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                        text-align: center;
                        transition: box-shadow 0.3s;
                    }
                    .car-card:hover {
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                    }
                    .car-name {
                        font-size: 20px;
                        font-weight: bold;
                        margin-bottom: 10px;
                        color: #333;
                    }
                    .car-load {
                        font-size: 16px;
                        color: #666;
                        margin-bottom: 15px;
                    }
                    .car-usergetoff {
                        font-size: 14px;
                        color: #999;
                        margin-top: 15px;
                    }
                    .car-button {
                        background-color: #0f9977;
                        color: #ffffff;
                        padding: 10px 20px;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 16px;
                        text-decoration: none;
                        display: inline-block;
                        transition: background-color 0.3s;
                    }
                    .car-button:hover {
                        background-color: #0e8a6b;
                    }
                    .logo {
                        display: block;
                        margin: 20px auto;
                        width: 250px;
                        height: auto;
                    }
                    .hostname {
                        font-size: 14px;
                        color: #999;
                        margin-bottom: 20px;
                    }
                    .car-usercount-green {
                    color: #0f9977; /* 与前文使用的一致的绿色 */
                    font-weight: bold;
                    }

                    /* 添加页脚图标样式 */
                    .footer-icons {
                        display: flex;
                        justify-content: center;
                        gap: 20px;
                        margin: 20px 0;
                    }
    
                    .footer-icons span {
                        position: relative;
                        width: 40px;
                        height: 40px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: color 0.3s;
                        font-size: 24px;
                    }
    
                    .footer-icons span:hover {
                        color: inherit;
                    }
    
                    .tooltip {
                        display: none;
                        position: absolute;
                        bottom: 50px;
                        background-color: rgba(255, 255, 255, 0.8);
                        color: black;
                        padding: 5px 10px;
                        border-radius: 10px;
                        backdrop-filter: blur(10px);
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                        white-space: nowrap;
                        transform: translateX(-50%);
                        left: 50%;
                        font-size: 12px;
                    }
    
                    .footer-icons span:hover .tooltip {
                        display: block;
                    }

                    .footer {
                        width: 100%;
                        text-align: center;
                        padding: 20px 0;
                        margin-top: 0px;
                    }
                    .footer a {
                        color: #0f9977;
                        text-decoration: none;
                        font-size: 14px;
                        transition: color 0.3s;
                    }
                    .footer a:hover {
                        color: #0e8a6b;
                    }
                    @media (max-width: 768px) {
                        .car-container {
                            flex-direction: column;
                            align-items: center;
                        }
                    }
                    .tab-notice {
                        width: 100%;
                        text-align: center;
                        padding: 10px 0;
                        background-color: rgba(15, 153, 119, 0.05);
                        border-bottom: 1px solid rgba(15, 153, 119, 0.1);
                        color: #0f9977;
                        font-size: 14px;
                        font-family: Arial, sans-serif;
                        margin-bottom: 20px;
                    }

                    /* 订阅相关样式 */
                    .subscription-modal {
                        display: none;
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.5);
                        z-index: 1000;
                    }

                    .modal-content {
                        background-color: #ffffff;
                        border-radius: 8px;
                        padding: 20px;
                        width: 90%;
                        max-width: 400px;
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        text-align: center;
                    }

                    .bell-icon {
                        cursor: pointer;
                        transition: transform 0.3s ease;
                        margin-left: 5px;
                        vertical-align: -1px;
                    }

                    .bell-icon:hover {
                        transform: scale(1.1);
                    }

                    .modal-close {
                        position: absolute;
                        right: 10px;
                        top: 10px;
                        cursor: pointer;
                        font-size: 20px;
                        color: #666;
                        border: none;
                        background: none;
                    }

                    .subscribe-input {
                        width: 100%;
                        padding: 10px;
                        margin: 10px 0;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        box-sizing: border-box;
                    }

                    .subscribe-btn {
                        background: #0f9977;
                        color: white;
                        padding: 10px 20px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 16px;
                        margin-top: 10px;
                    }


<style>
  #dify-chatbot-bubble-button {
    background-color: #1C64F2 !important;
  }
  #dify-chatbot-bubble-window {
    width: 24rem !important;
    height: 40rem !important;
  }
</style>

                </style>
            </head>
            <body>
                <img src="https://wehugai.com/images/qms.png" alt="Qiumingshan Logo" class="logo">
                <div class="hostname">每天早上8点到期乘客自动下车</div>
                <div class="hostname">点这个👉<span class="iconfont icon-xiaolingdang bell-icon" onclick="showSubscriptionModal()"></span> 当有 Pro 车位空出时，我们会邮件通知您</div>
                <div class="tab-container">
                    <div class="tabs">
                        <div class="tab ${bikeClaudeActive}" data-tab="claudeBike">Claude共享单车</div>
                        <div class="tab ${publicClaudeActive}" data-tab="claudePublic">Claude公益车</div>
                        <div class="tab ${proClaudeActive}" data-tab="claudePro">Claude Pro 拼车</div>
                        <div class="tab ${vipClaudeActive}" data-tab="claudeVip">Claude Pro 专车</div>
                    </div>

                    <!-- 共享单车标签页 -->
                    <div id="claudeBike" class="tab-content ${bikeClaudeActive}">
                        <div class="tab-notice">每次上车持续时长：1天</div>
                        <div class="car-container">
                            ${bikeVehicles.map(vehicle => `
                                <div class="car-card">
                                    <div class="car-name">${vehicle.carName}</div>
                                    <div class="car-load">乘客：<span class="${vehicle.userCount < vehicle.load ? 'car-usercount-green' : ''}">${vehicle.userCount}</span>/${vehicle.load}</div>
                                    <a href="${vehicle.url}" class="car-button">上车</a>
                                    <div class="car-usergetoff">最近一个用户的下车时间：${vehicle.userGetOff}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- 公益车标签页 -->
                    <div id="claudePublic" class="tab-content ${publicClaudeActive}">
                        <div class="tab-notice">每次上车持续时长：1个月</div>
                        <div class="car-container">
                            ${publicVehicles.map(vehicle => `
                                <div class="car-card">
                                    <div class="car-name">${vehicle.carName}</div>
                                    <div class="car-load">乘客：<span class="${vehicle.userCount < vehicle.load ? 'car-usercount-green' : ''}">${vehicle.userCount}</span>/${vehicle.load}</div>
                                    <a href="${vehicle.url}" class="car-button">上车</a>
                                    <div class="car-usergetoff">最近一个用户的下车时间：${vehicle.userGetOff}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- 拼车标签页 -->
                    <div id="claudePro" class="tab-content ${proClaudeActive}">
                        <div class="tab-notice">每5小时可以发送至少45条消息，车上的乘客共享额度</div>
                        <div class="car-container">
                            ${proVehicles.map(vehicle => `
                                <div class="car-card">
                                    <div class="car-name">${vehicle.carName}</div>
                                    <div class="car-load">乘客：<span class="${vehicle.userCount < vehicle.load ? 'car-usercount-green' : ''}">${vehicle.userCount}</span>/${vehicle.load}</div>
                                    <a href="${vehicle.url}" class="car-button">上车</a>
                                    <div class="car-usergetoff">最近一个用户的下车时间：${vehicle.userGetOff}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- 专车标签页 -->
                    <div id="claudeVip" class="tab-content ${vipClaudeActive}">
                        <div class="car-container">
                            ${vipVehicles.map(vehicle => `
                                <div class="car-card">
                                    <div class="car-name">${vehicle.carName}</div>
                                    <div class="car-load">乘客：<span class="${vehicle.userCount < vehicle.load ? 'car-usercount-green' : ''}">${vehicle.userCount}</span>/${vehicle.load}</div>
                                    <a href="${vehicle.url}" class="car-button">上车</a>
                                    <div class="car-usergetoff">最近一个用户的下车时间：${vehicle.userGetOff}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

<script>
 window.difyChatbotConfig = {
  token: 'xVsXu0taY1Zm5ywu'
 }
</script>
<script
 src="https://udify.app/embed.min.js"
 id="xVsXu0taY1Zm5ywu"
 defer>
</script>

                <script>
                    const tabs = document.querySelectorAll('.tab');
                    const tabContents = document.querySelectorAll('.tab-content');
    
                    tabs.forEach(tab => {
                        tab.addEventListener('click', () => {
                            // 移除所有选项卡的激活状态
                            tabs.forEach(t => t.classList.remove('active'));
                            tabContents.forEach(c => c.classList.remove('active'));
    
                            // 激活当前选项卡和对应的内容
                            tab.classList.add('active');
                            document.getElementById(tab.getAttribute('data-tab')).classList.add('active');
                        });
                    });

                    // 订阅相关函数
                    function showSubscriptionModal() {
                        document.getElementById('subscriptionModal').style.display = 'block';
                    }

                    function closeModal() {
                        document.getElementById('subscriptionModal').style.display = 'none';
                    }

                    // 点击模态框外部关闭
                    window.onclick = function(event) {
                        if (event.target.className === 'subscription-modal') {
                            closeModal();
                        }
                    }

                    async function handleSubscribe(event) {
                        event.preventDefault();
                        const email = document.getElementById('subscribeEmail').value;
                        
                        try {
                            const response = await fetch('/api/subscribe', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ email })
                            });
                            
                            if (response.ok) {
                                alert('订阅成功！我们会在有空位时通知您。');
                                closeModal();
                            } else {
                                const data = await response.json();
                                alert(data.error || '订阅失败，请稍后重试。');
                            }
                        } catch (error) {
                            alert('订阅失败，请稍后重试。');
                        }
                    }
                </script>
                
                <!-- 在 footer 前添加订阅模态框 -->
                <div id="subscriptionModal" class="subscription-modal">
                    <div class="modal-content">
                        <button class="modal-close" onclick="closeModal()">&times;</button>
                        <h2 style="color: #333; margin-bottom: 15px;">订阅 Pro 车位提醒</h2>
                        <p style="color: #666;">当有 Pro 车位空出时，我们会第一时间通知您</p>
                        <form id="subscriptionForm" onsubmit="handleSubscribe(event)">
                            <input type="email" id="subscribeEmail" 
                                class="subscribe-input" 
                                required 
                                placeholder="请输入您的邮箱">
                            <button type="submit" class="subscribe-btn">订阅</button>
                        </form>
                    </div>
                </div>

                <!-- 在 body 结束前添加页脚图标 -->
                <div class="footer-icons">
                    <span onclick="window.open('https://linux.do/u/ethanhunt', '_blank')">
                        <span class="iconfont icon-linux"></span>
                        <div class="tooltip">L站联系我</div>
                    </span>
                    <span onclick="window.open('https://wehugai.com/images/gzh-qrcode.png', '_blank')">
                        <span class="iconfont icon-gongzhonghao"></span>
                        <div class="tooltip">公众号联系我</div>
                    </span>
                </div>
                <div class="footer">
                <a href="https://home.aiporters.com" target="_blank">Copyright © 2024 AI自强少年</a>
                </div>
            </body>
            </html>`;
        return new Response(stationPage, { headers: { 'Content-Type': 'text/html' } });
    }  