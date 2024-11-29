addEventListener('fetch', event => {
    event.respondWith(handleStationRequest(event.request));
  });
  
  const vehicleNames = [
      'haibao',
      'haima',
      'haiou', 
      'haishi', 
      'haitun', 
      'haixiang', 
      'haibaopro', 
      'haimapro',
      'haioupro', 
      'haishipro', 
      'haitunpro'
  ];
  
  
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
            return vehicleData;
        }
        return null;
      });
  
      const vehicleDataArray = await Promise.all(vehicleDataPromises);
  
      // 将车辆分类为公益车和 Pro 车
      const publicVehicles = vehicleDataArray.filter(v => v && !v.name.endsWith('pro'));
      const proVehicles = vehicleDataArray.filter(v => v && v.name.endsWith('pro'));
  
      // 根据主机名确定默认选项卡
      const defaultTab = hostname.endsWith('.top') ? 'public' : 'pro';
      const publicClaudeActive = defaultTab === 'public' ? 'active' : '';
      const proClaudeActive = defaultTab === 'pro' ? 'active' : '';
  
    const stationPage = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
            <title>Ai公益车站</title>
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
                @media (max-width: 768px) {
                    .car-container {
                        flex-direction: column;
                        align-items: center;
                    }
                }
            </style>
        </head>
        <body>
            <img src="https://wehugai.com/images/qms.png" alt="Qiumingshan Logo" class="logo">
            <div class="hostname">想要pro发新车的可以公众号私信联系</div>
            <div class="tab-container">
                <div class="tabs">
                    <div class="tab ${publicClaudeActive}" data-tab="claudePublic">Claude公益车</div>
                    <div class="tab ${proClaudeActive}" data-tab="claudePro">Claude Pro 拼车</div>
                </div>
                <div id="claudePublic" class="tab-content ${publicClaudeActive}">
                    <div class="car-container">
                        ${publicVehicles.map(vehicle => `
                            <div class="car-card">
                                <div class="car-name">${vehicle.carName}</div>
                                <div class="car-load">乘客：${vehicle.userCount}/${vehicle.load}</div>
                                <a href="${vehicle.url}" class="car-button">上车</a>
                                <div class="car-usergetoff">最近一个用户的下车时间：${vehicle.userGetOff}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div id="claudePro" class="tab-content ${proClaudeActive}">
                    <div class="car-container">
                        ${proVehicles.map(vehicle => `
                            <div class="car-card">
                                <div class="car-name">${vehicle.carName}</div>
                                <div class="car-load">乘客：${vehicle.userCount}/${vehicle.load}</div>
                                <a href="${vehicle.url}" class="car-button">上车</a>
                                <div class="car-usergetoff">最近一个用户的下车时间：${vehicle.userGetOff}</div>
                            </div>
                        `).join('')}
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
  