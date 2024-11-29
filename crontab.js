addEventListener('scheduled', event => {
    event.waitUntil(handleScheduledEvent(event));
});

const vehicleNames = [
    'haitun',
    'haibao',
    'haiou',
    'haishi',
    'haima',
    'haixiang',
    'haitunpro',
    'haibaopro',
    'haioupro',
    'haishipro',
    'haimapro'
];

async function updateStationData(namespace, vehicleName) {
    const [load, carName, users, userGetOff, baseUrl] = await Promise.all([
        namespace.get('load'),
        namespace.get('car_name'),
        namespace.get('users'),
        namespace.get('user_earliest_get_off_date'),
        namespace.get('base_url')
    ]);

    const userCount = users ? users.split(',').length : 0;
    const userGetOffDisplay = userGetOff || '暂无';

    const summaryData = {
        load,
        carName,
        userCount,
        userGetOff: userGetOffDisplay,
        baseUrl 
    };

    await stationDataKV.put(vehicleName, JSON.stringify(summaryData));
}

async function handleScheduledEvent(event) {
    for (const vehicleName of vehicleNames) {
        const namespace = globalThis[vehicleName];
        if (!namespace) {
            console.error(`KV namespace binding not found for vehicle: ${vehicleName}`);
            continue;
        }

        console.log(`Processing namespace: ${vehicleName}`);
        
        const userJoined = await namespace.get("user_joined");
        if (!userJoined) {
            console.log(`No data in user_joined for namespace: ${vehicleName}`);
            // 设置默认的最近下车时间
            const defaultGetOffDate = '暂无'; // 您可以根据需要修改默认值
            await namespace.put("user_earliest_get_off_date", defaultGetOffDate);
            console.log(`Set user_earliest_get_off_date for namespace: ${vehicleName} to default value '${defaultGetOffDate}'`);
            continue; // 跳过当前命名空间
        }

        const currentDate = new Date().toISOString().split('T')[0]; // 获取当前日期，不包括时间
        const entries = userJoined.split(',');
        const updatedEntries = entries.filter(entry => {
            const [userName, expireDate] = entry.split(':');
            return expireDate >= currentDate; // 只比较日期
        });

        // 更新用户加入时间列表
        await namespace.put("user_joined", updatedEntries.join(','));
        console.log(`Updated user_joined for namespace: ${vehicleName} with ${updatedEntries.length} entries`);

        // 更新用户列表
        const updatedUserNames = updatedEntries.map(entry => entry.split(':')[0]);
        await namespace.put("users", updatedUserNames.join(','));
        console.log(`Updated users for namespace: ${vehicleName} with ${updatedUserNames.length} users`);

        // 更新最近下车时间
        const earliestDateStr = getEarliestGetOffDate(updatedEntries);
        if (earliestDateStr) {
            await namespace.put("user_earliest_get_off_date", earliestDateStr);
            console.log(`Updated user_earliest_get_off_date for namespace: ${vehicleName} to ${earliestDateStr}`);
        } else {
            // 如果没有用户，设置默认值
            const defaultGetOffDate = '暂无'; // 您可以根据需要修改默认值
            await namespace.put("user_earliest_get_off_date", defaultGetOffDate);
            console.log(`Set user_earliest_get_off_date for namespace: ${vehicleName} to default value '${defaultGetOffDate}'`);
        }

        // 更新车辆的概要信息到 stationDataKV
        await updateStationData(namespace, vehicleName);
        console.log(`Updated station data for vehicle: ${vehicleName}`);
    }
}

// 定义获取最近下车时间的函数
function getEarliestGetOffDate(entries) {
    let earliestDateStr = null;
    for (let entry of entries) {
        const [userName, dateStr] = entry.split(':');
        if (dateStr) {
            if (!earliestDateStr || dateStr < earliestDateStr) {
                earliestDateStr = dateStr;
            }
        }
    }
    return earliestDateStr;
}

// 手动触发以进行调试
addEventListener('fetch', event => {
    if (new URL(event.request.url).pathname === '/run-scheduled-task') {
        event.respondWith(runScheduledTask());
    } else {
        event.respondWith(new Response('Not Found', { status: 404 }));
    }
});

async function runScheduledTask() {
    try {
        await handleScheduledEvent();
        return new Response('Scheduled task executed successfully', { status: 200 });
    } catch (error) {
        console.error('Error executing scheduled task:', error);
        return new Response('Error executing scheduled task', { status: 500 });
    }
}
