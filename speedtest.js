// 节点测速脚本 for Sub-Store
// 更新日期：2024-03-21

function operator(proxies) {
    const results = [];
    
    // 测试配置
    const config = {
        pingUrl: 'http://www.gstatic.com/generate_204',
        timeout: 3000,
        pingCount: 3,  // 每个节点测试次数
        concurrency: 5  // 并发测试数
    };
    
    // 测试延迟
    function testDelay(proxy) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            $httpClient.get({
                url: config.pingUrl,
                timeout: config.timeout
            }, (error, response) => {
                if (error) {
                    resolve(0);
                } else {
                    resolve(Date.now() - startTime);
                }
            });
        });
    }
    
    // 测试速度
    function testSpeed(proxy) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            let downloaded = 0;
            
            $httpClient.get({
                url: "http://cachefly.cachefly.net/10mb.test",
                timeout: 5000
            }, (error, response, data) => {
                if (error) {
                    resolve(0);
                } else {
                    const time = (Date.now() - startTime) / 1000;
                    const speed = data.length / 1024 / 1024 / time; // MB/s
                    resolve(speed);
                }
            });
        });
    }
    
    // 处理每个节点
    for (let proxy of proxies) {
        try {
            // 测试延迟
            const delay = testDelay(proxy);
            
            // 如果延迟正常，测试速度
            let speed = 0;
            if (delay > 0 && delay < 1000) {
                speed = testSpeed(proxy);
            }
            
            // 添加测试结果到节点名
            if (delay > 0) {
                proxy.name = `[${delay}ms ${speed.toFixed(1)}MB/s] ${proxy.name}`;
            } else {
                proxy.name = `[超时] ${proxy.name}`;
            }
            
            results.push(proxy);
            
        } catch (err) {
            console.log(`节点 ${proxy.name} 测试失败: ${err}`);
            proxy.name = `[失败] ${proxy.name}`;
            results.push(proxy);
        }
    }
    
    // 按延迟排序
    return results.sort((a, b) => {
        const delayA = parseInt(a.name.match(/\[(\d+)ms/)?.[1] || '9999');
        const delayB = parseInt(b.name.match(/\[(\d+)ms/)?.[1] || '9999');
        return delayA - delayB;
    });
}

// 导出
module.exports = {
    operator
}; 
