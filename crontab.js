addEventListener('scheduled', event => {
    event.waitUntil(handleScheduledEvent(event));
});

// 所有车辆名称
const vehicleNames = [
    'meimeituan',
    'meituantuan',
    'hahaluo',
    'haluoluo',
    'qingqingju',
    'qingjuju',
    'haidao',
    'haifeng',
    'haitan',
    'haigui',
    'haidai',
    'haitai',
    'haitun',
    'haibao',
    'haiou',
    'haishi',
    'haima',
    'haixiang',
    'hailuo',
    'haixing',
    'haidan',
    'haitunpro',
    'haibaopro',
    'haioupro',
    'haishipro',
    'haimapro',
    'haixiangpro',
    'haiwangpro',
    'haidaopro',
    'haitanpro',
    'haifengpro',
    'haiguipro',
    'haidaipro',
    'haishenpro',
    'haicaopro',
    'haixingpro'
];

/**
 * 定时任务的主函数
 * @param {ScheduledEvent} event
 * @param {boolean} shouldSendNotification 是否发送 Pro 车位通知
 */
async function handleScheduledEvent(event, shouldSendNotification = true) {
    for (const vehicleName of vehicleNames) {
        const namespace = globalThis[vehicleName];
        if (!namespace) {
            // 如找不到对应的 KV binding，就跳过
            continue;
        }

        // 更新 user_joined
        const userJoined = await namespace.get("user_joined");
        if (userJoined) {
            const currentDate = new Date().toISOString().split('T')[0];
            const entries = userJoined.split(',');
            const updatedEntries = entries.filter(entry => {
                const [userName, expireDate] = entry.split(':');
                return expireDate > currentDate; 
            });

            // 更新 user_joined
            await namespace.put("user_joined", updatedEntries.join(','));

            // 更新 users (仅保留用户名)
            const updatedUserNames = updatedEntries.map(entry => entry.split(':')[0]);
            await namespace.put("users", updatedUserNames.join(','));

            // 更新 user_earliest_get_off_date
            const earliestDateStr = getEarliestGetOffDate(updatedEntries);
            await namespace.put("user_earliest_get_off_date", earliestDateStr || '暂无');
        } else {
            // 如果没有 user_joined 数据
            await namespace.put("users", "");
            await namespace.put("user_earliest_get_off_date", "暂无");
        }

        // 无论如何都更新 stationDataKV
        await updateStationData(namespace, vehicleName);
    }

    // 只在需要时发送通知
    if (shouldSendNotification) {
        await sendProVehicleNotifications();
    }
}

/**
 * 更新 stationDataKV：车载信息汇总
 */
async function updateStationData(namespace, vehicleName) {
    try {
        const [load, carName, users, userGetOff, baseUrl] = await Promise.all([
            namespace.get('load'),
            namespace.get('car_name'),
            namespace.get('users'),
            namespace.get('user_earliest_get_off_date'),
            namespace.get('base_url')
        ]);

        const userCount = users ? users.split(',').length : 0;
        const summaryData = {
            load: load || '0',
            carName: carName || vehicleName,
            userCount,
            userGetOff: userGetOff || '暂无',
            baseUrl: baseUrl || ''
        };

        await stationDataKV.put(vehicleName, JSON.stringify(summaryData));
    } catch (error) {
        // 出错时也要继续处理其他车辆
        console.error(`updateStationData error [${vehicleName}]:`, error);
    }
}

/**
 * 扫描所有 Pro 车辆，如果有空位就发送通知给订阅者
 */
async function sendProVehicleNotifications() {
    // 1. 获取所有 Pro 车辆的数据信息
    const proVehicles = vehicleNames
        .filter(name => name.endsWith('pro'))
        .map(async name => {
            const data = await stationDataKV.get(name);
            return data ? JSON.parse(data) : null;
        });

    const vehicleData = await Promise.all(proVehicles);
    const availableVehicles = vehicleData.filter(v => 
        v && (parseInt(v.load) - v.userCount) > 0
    );

    if (availableVehicles.length === 0) {
        // 没有可用车位就不发通知
        return;
    }

    // 2. 获取所有订阅者
    const subscribers = await proSubscribersKV.list();
    if (!subscribers || subscribers.keys.length === 0) {
        return;
    }

    // 3. 给每个订阅者发送邮件
    for (const { name: email } of subscribers.keys) {
        try {
            const subscriberData = await proSubscribersKV.get(email, 'json');
            if (!subscriberData) {
                continue;
            }
            await sendEmailViaAliyunWorker({
                to: email,
                subject: 'Pro 车位空位提醒 - AI公益车站',
                html: generateNotificationEmail(availableVehicles),
                unsubscribeToken: subscriberData.unsubscribeToken
            });
        } catch (error) {
            console.error(`sendProVehicleNotifications error [${email}]:`, error);
        }
    }
}

/**
 * 计算最早下车时间
 */
function getEarliestGetOffDate(entries) {
    let earliest = null;
    for (let entry of entries) {
        const [_, dateStr] = entry.split(':');
        if (dateStr && (!earliest || dateStr < earliest)) {
            earliest = dateStr;
        }
    }
    return earliest;
}

/**
 * 生成通知邮件（HTML）
 */
function generateNotificationEmail(availableVehicles) {
    const vehiclesList = availableVehicles
        .map(v => {
            const availableSeats = parseInt(v.load) - v.userCount;
            return `
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">${v.carName}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${availableSeats}个</td>
                </tr>
            `;
        })
        .join('');

    return `
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 20px 0; 
                }
                th { 
                    background-color: #f5f5f5; 
                    padding: 10px; 
                    border: 1px solid #ddd; 
                }
                .footer { 
                    margin-top: 20px; 
                    padding-top: 20px; 
                    border-top: 1px solid #eee; 
                    font-size: 12px; 
                    color: #666; 
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Pro 车位空位提醒</h2>
                <p>您好！目前有以下 Pro 车位可用：</p>
                
                <table>
                    <tr>
                        <th>车辆名称</th>
                        <th>可用座位</th>
                    </tr>
                    ${vehiclesList}
                </table>
                
                <p>如果您想上车，请前往 <a href="https://station.aiporters.com">AI公益车站</a>。</p>
                
                <div class="footer">
                    <p>如果您不想再收到此类通知，请
                    <a href="https://station.aiporters.com/unsubscribe?email={{email}}&token={{unsubscribeToken}}">点击这里退订</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
}

/** 
 * 不再有 aliPercentEncode / calculateSignature / sendEmail 
 * 而是调用我们远程 Worker
 */
async function sendEmailViaAliyunWorker({ to, subject, html, unsubscribeToken }) {
    const emailContent = html
        .replace('{{email}}', encodeURIComponent(to))
        .replace('{{unsubscribeToken}}', unsubscribeToken);

    try {
        const res = await fetch("https://aliyun-email-sender.wehugai.com", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ to, subject, html: emailContent })
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Email worker responded with ${res.status}: ${errText}`);
        }

        const result = await res.json();
        if (result.error) {
            throw new Error(`Email worker error: ${result.error}`);
        }
        // console.log('Email sent successfully:', result);
        return result;
    } catch (err) {
        console.error('Failed to send email via external worker:', err);
        throw err;
    }
}

/**
 * 手动触发
 */
addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (url.pathname === '/run-scheduled-task') {
        const sendNotification = url.searchParams.get('notify') === 'true';
        event.respondWith(runScheduledTask(sendNotification));
    }
    else {
        event.respondWith(new Response('Not Found', { status: 404 }));
    }
});

async function runScheduledTask(sendNotification = false) {
    try {
        await handleScheduledEvent(null, sendNotification);
        const msg = sendNotification 
            ? 'Scheduled task success (with notifications)'
            : 'Scheduled task success (no notifications)';
        return new Response(msg, { status: 200 });
    } catch (error) {
        console.error('Scheduled task error:', error);
        return new Response('Error executing scheduled task', { status: 500 });
    }
}