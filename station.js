addEventListener('fetch', event => {
    event.respondWith(handleStationRequest());
});


async function handleStationRequest() {
    const qinLoad = await qinKV.get('load');
    const qinName = await qinKV.get('car_name');
    const qinUsers = await qinKV.get('users');
    const qinUserCount = qinUsers ? qinUsers.split(',').length : 0;

    const hanLoad = await hanKV.get('load');
    const hanName = await hanKV.get('car_name');
    const hanUsers = await hanKV.get('users');
    const hanUserCount = hanUsers ? hanUsers.split(',').length : 0;

    const tangLoad = await tangKV.get('load');
    const tangName = await tangKV.get('car_name');
    const tangUsers = await tangKV.get('users');
    const tangUserCount = tangUsers ? tangUsers.split(',').length : 0;

    const songLoad = await songKV.get('load');
    const songName = await songKV.get('car_name');
    const songUsers = await songKV.get('users');
    const songUserCount = songUsers ? songUsers.split(',').length : 0;

    const yuanLoad = await yuanKV.get('load');
    const yuanName = await yuanKV.get('car_name');
    const yuanUsers = await yuanKV.get('users');
    const yuanUserCount = yuanUsers ? yuanUsers.split(',').length : 0;

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
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    background-color: #f9f9f9;
                }
                h1 {
                    text-align: center;
                    margin-bottom: 20px;
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
                }
                .car-load {
                    font-size: 16px;
                    color: #666;
                    margin-bottom: 15px;
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
            <h1>ChatGPT公益车站</h1>
            <div class="car-container">
                <div class="car-card">
                    <div class="car-name">${qinName}</div>
                    <div class="car-load">${qinUserCount}/${qinLoad}</div>
                    <a href="https://qin.hugai.top" class="car-button">上车</a>
                </div>
                <div class="car-card">
                    <div class="car-name">${hanName}</div>
                    <div class="car-load">${hanUserCount}/${hanLoad}</div>
                    <a href="https://han.hugai.top" class="car-button">上车</a>
                </div>                
                <div class="car-card">
                    <div class="car-name">${tangName}</div>
                    <div class="car-load">${tangUserCount}/${tangLoad}</div>
                    <a href="https://tang.hugai.top" class="car-button">上车</a>
                </div>
                <div class="car-card">
                    <div class="car-name">${songName}</div>
                    <div class="car-load">${songUserCount}/${songLoad}</div>
                    <a href="https://song.hugai.top" class="car-button">上车</a>
                </div>
                <div class="car-card">
                    <div class="car-name">${yuanName}</div>
                    <div class="car-load">${yuanUserCount}/${yuanLoad}</div>
                    <a href="https://yuan.hugai.top" class="car-button">上车</a>
                </div>
            </div>
        </body>
        </html>`;
    return new Response(stationPage, { headers: { 'Content-Type': 'text/html' } });
}
