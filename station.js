addEventListener('fetch', event => {
    event.respondWith(handleStationRequest());
});

// 添加 getEarliestGetOffDate 函数
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
        return '暂无下车时间'; // 您可以根据需要修改默认显示内容
    }
}

async function handleStationRequest() {
    const zhouLoad = await zhouKV.get('load');
    const zhouName = await zhouKV.get('car_name');
    const zhouUsers = await zhouKV.get('users');
    const zhouUserCount = zhouUsers ? zhouUsers.split(',').length : 0;
    const zhouUserJoined = await zhouKV.get('user_joined');
    const zhouUserGetOff = getEarliestGetOffDate(zhouUserJoined);

    const qinLoad = await qinKV.get('load');
    const qinName = await qinKV.get('car_name');
    const qinUsers = await qinKV.get('users');
    const qinUserCount = qinUsers ? qinUsers.split(',').length : 0;
    const qinUserJoined = await qinKV.get('user_joined');
    const qinUserGetOff = getEarliestGetOffDate(qinUserJoined);

    const hanLoad = await hanKV.get('load');
    const hanName = await hanKV.get('car_name');
    const hanUsers = await hanKV.get('users');
    const hanUserCount = hanUsers ? hanUsers.split(',').length : 0;
    const hanUserJoined = await hanKV.get('user_joined');
    const hanUserGetOff = getEarliestGetOffDate(hanUserJoined);

    const suiLoad = await suiKV.get('load');
    const suiName = await suiKV.get('car_name');
    const suiUsers = await suiKV.get('users');
    const suiUserCount = suiUsers ? suiUsers.split(',').length : 0;
    const suiUserJoined = await suiKV.get('user_joined');
    const suiUserGetOff = getEarliestGetOffDate(suiUserJoined);

    const tangLoad = await tangKV.get('load');
    const tangName = await tangKV.get('car_name');
    const tangUsers = await tangKV.get('users');
    const tangUserCount = tangUsers ? tangUsers.split(',').length : 0;
    const tangUserJoined = await tangKV.get('user_joined');
    const tangUserGetOff = getEarliestGetOffDate(tangUserJoined);

    const songLoad = await songKV.get('load');
    const songName = await songKV.get('car_name');
    const songUsers = await songKV.get('users');
    const songUserCount = songUsers ? songUsers.split(',').length : 0;
    const songUserJoined = await songKV.get('user_joined');
    const songUserGetOff = getEarliestGetOffDate(songUserJoined);

    const yuanLoad = await yuanKV.get('load');
    const yuanName = await yuanKV.get('car_name');
    const yuanUsers = await yuanKV.get('users');
    const yuanUserCount = yuanUsers ? yuanUsers.split(',').length : 0;
    const yuanUserJoined = await yuanKV.get('user_joined');
    const yuanUserGetOff = getEarliestGetOffDate(yuanUserJoined);

    const hanplusLoad = await hanplusKV.get('load');
    const hanplusName = await hanplusKV.get('car_name');
    const hanplusUsers = await hanplusKV.get('users');
    const hanplusUserCount = hanplusUsers ? hanplusUsers.split(',').length : 0;
    const hanplusUserJoined = await hanplusKV.get('user_joined');
    const hanplusUserGetOff = getEarliestGetOffDate(hanplusUserJoined);

    // 构建页面模板，添加最近下车时间的信息，添加选项卡功能
    const stationPage = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="apple-touch-icon" sizes="180x180" href="https://cdn1.oaifree.com/_next/static/media/apple-touch-icon.82af6fe1.png"/>
            <link rel="icon" type="image/png" sizes="32x32" href="https://cdn4.oaifree.com/_next/static/media/favicon-32x32.630a2b99.png"/>
            <link rel="icon" type="image/png" sizes="16x16" href="https://cdn4.oaifree.com/_next/static/media/favicon-16x16.a052137e.png"/>

            <title>ChatGPT 公益车站</title>
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
                @media (max-width: 768px) {
                    .car-container {
                        flex-direction: column;
                        align-items: center;
                    }
                }
            </style>
        </head>
        <body>
            <div class="tab-container">
                <div class="tabs">
                    <div class="tab active" data-tab="public">ChatGPT公益车站</div>
                    <div class="tab" data-tab="plus">ChatGPT Plus 拼车服务</div>
                </div>
                <div id="public" class="tab-content active">
                    <div class="car-container">
                        <div class="car-card">
                            <div class="car-name">${zhouName}</div>
                            <div class="car-load">乘客：${zhouUserCount}/${zhouLoad}</div>
                            <a href="https://zhou.hugai.top" class="car-button">上车</a>
                            <div class="car-usergetoff">最近一个用户的下车时间：${zhouUserGetOff}</div>
                        </div>
                        <div class="car-card">
                            <div class="car-name">${qinName}</div>
                            <div class="car-load">乘客：${qinUserCount}/${qinLoad}</div>
                            <a href="https://qin.hugai.top" class="car-button">上车</a>
                            <div class="car-usergetoff">最近一个用户的下车时间：${qinUserGetOff}</div>
                        </div>
                        <div class="car-card">
                            <div class="car-name">${hanName}</div>
                            <div class="car-load">乘客：${hanUserCount}/${hanLoad}</div>
                            <a href="https://han.hugai.top" class="car-button">上车</a>
                            <div class="car-usergetoff">最近一个用户的下车时间：${hanUserGetOff}</div>
                        </div>
                        <div class="car-card">
                            <div class="car-name">${suiName}</div>
                            <div class="car-load">乘客：${suiUserCount}/${suiLoad}</div>
                            <a href="https://sui.hugai.top" class="car-button">上车</a>
                            <div class="car-usergetoff">最近一个用户的下车时间：${suiUserGetOff}</div>
                        </div>                
                        <div class="car-card">
                            <div class="car-name">${tangName}</div>
                            <div class="car-load">乘客：${tangUserCount}/${tangLoad}</div>
                            <a href="https://tang.hugai.top" class="car-button">上车</a>
                            <div class="car-usergetoff">最近一个用户的下车时间：${tangUserGetOff}</div>
                        </div>
                        <div class="car-card">
                            <div class="car-name">${songName}</div>
                            <div class="car-load">乘客：${songUserCount}/${songLoad}</div>
                            <a href="https://song.hugai.top" class="car-button">上车</a>
                            <div class="car-usergetoff">最近一个用户的下车时间：${songUserGetOff}</div>
                        </div>
                        <div class="car-card">
                            <div class="car-name">${yuanName}</div>
                            <div class="car-load">乘客：${yuanUserCount}/${yuanLoad}</div>
                            <a href="https://yuan.hugai.top" class="car-button">上车</a>
                            <div class="car-usergetoff">最近一个用户的下车时间：${yuanUserGetOff}</div>
                        </div>
                    </div>
                </div>
                <div id="plus" class="tab-content">
                    <div class="car-container">
                        <div class="car-card">
                            <div class="car-name">${hanplusName}</div>
                            <div class="car-load">乘客：${hanplusUserCount}/${hanplusLoad}</div>
                            <a href="https://hanplus.aiporters.com" class="car-button">上车</a>
                            <div class="car-usergetoff">最近一个用户的下车时间：${hanplusUserGetOff}</div>
                    </div>
                </div>
            </div>
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
            </script>
        </body>
        </html>`;
    return new Response(stationPage, { headers: { 'Content-Type': 'text/html' } });
}
