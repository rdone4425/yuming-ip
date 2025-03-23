// 节点测速脚本 for Sub-Store
// 更新日期：2024-03-21

function operator(proxies) {
    const results = [];
    let completed = 0;
    
    // 测速配置
    const config = {
        url: 'http://www.gstatic.com/generate_204',
        timeout: 3000
    };
    
    // 返回一个 Promise，在所有测试完成时 resolve
    return new Promise((resolve) => {
        // 测试每个节点
        proxies.forEach((proxy) => {
            const startTime = Date.now();
            
            $httpClient.get({
                url: config.url,
                timeout: config.timeout,
                node: proxy.name
            }, (error, response) => {
                if (error) {
                    proxy.name = `[超时] ${proxy.name}`;
                } else {
                    const delay = Date.now() - startTime;
                    proxy.name = `[${delay}ms] ${proxy.name}`;
                }
                
                results.push(proxy);
                completed++;
                
                // 当所有节点都测试完成时
                if (completed === proxies.length) {
                    // 按延迟排序
                    const sortedResults = results.sort((a, b) => {
                        const delayA = parseInt(a.name.match(/\[(\d+)ms/)?.[1] || '9999');
                        const delayB = parseInt(b.name.match(/\[(\d+)ms/)?.[1] || '9999');
                        return delayA - delayB;
                    });
                    
                    resolve(sortedResults);
                }
            });
        });
    });
}

module.exports = { operator }; 
