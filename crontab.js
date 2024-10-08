addEventListener('scheduled', event => {
    event.waitUntil(handleScheduledEvent(event));
})

async function handleScheduledEvent(event) {
    // 每个Worker的KV命名空间
    const namespaces = {
        zhou:zhouNamespace,
        qin: qinNamespace,
        han: hanNamespace,
        sui: suiNamespace,
        tang: tangNamespace,
        song: songNamespace,
        yuan: yuanNamespace,
        hanplus:hanplusNamespace,
        plus:plusNamespace
    };

    for (const namespaceName in namespaces) {
        const namespace = namespaces[namespaceName];
        console.log(`Processing namespace: ${namespaceName}`);
        
        const userJoined = await namespace.get("user_joined");
        if (!userJoined) {
            console.log(`No data in user_joined for namespace: ${namespaceName}`);
            continue; // 如果没有数据，跳过当前命名空间
        }

        const currentDate = new Date().toISOString().split('T')[0]; // 获取当前日期，不包括时间
        const entries = userJoined.split(',');
        const updatedEntries = entries.filter(entry => {
            const [userName, expireDate] = entry.split(':');
            return expireDate >= currentDate; // 只比较日期
        });

        // 更新用户加入时间列表
        await namespace.put("user_joined", updatedEntries.join(','));
        console.log(`Updated user_joined for namespace: ${namespaceName} with ${updatedEntries.length} entries`);

        // 更新用户列表
        const updatedUserNames = updatedEntries.map(entry => entry.split(':')[0]);
        await namespace.put("users", updatedUserNames.join(','));
        console.log(`Updated users for namespace: ${namespaceName} with ${updatedUserNames.length} users`);
    }
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
