// 节点测速脚本 for Sub-Store
// 更新日期：2024-03-21

function operator(proxies) {
    // 测试配置
    const config = {
        pingUrl: 'http://www.gstatic.com/generate_204',
        timeout: 3000
    };
    
    // 测试延迟
    function testDelay(proxy) {
        try {
            const startTime = Date.now();
            const response = $httpClient.get({
                url: config.pingUrl,
                timeout: config.timeout,
                node: proxy.name
            });
            
            if (response.error) {
                return 0;
            }
            return Date.now() - startTime;
        } catch (err) {
            return 0;
        }
    }
    
    // 处理每个节点
    return proxies.map(proxy => {
        try {
            // 测试延迟
            const delay = testDelay(proxy);
            
            // 添加测试结果到节点名
            if (delay > 0) {
                proxy.name = `[${delay}ms] ${proxy.name}`;
            } else {
                proxy.name = `[超时] ${proxy.name}`;
            }
            
        } catch (err) {
            console.log(`节点 ${proxy.name} 测试失败: ${err}`);
            proxy.name = `[失败] ${proxy.name}`;
        }
        
        return proxy;
    }).sort((a, b) => {
        const delayA = parseInt(a.name.match(/\[(\d+)ms/)?.[1] || '9999');
        const delayB = parseInt(b.name.match(/\[(\d+)ms/)?.[1] || '9999');
        return delayA - delayB;
    });
}

// 导出
module.exports = {
    operator
}; 
