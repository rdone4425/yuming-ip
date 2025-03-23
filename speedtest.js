// 节点测速脚本 for Sub-Store
// 更新日期：2024-03-21

function operator(proxies) {
    return new Promise((resolve) => {
        let completedTests = 0;
        const nodes = proxies.map(proxy => {
            // 测试延迟
            const startTime = Date.now();
            
            $httpClient.get({
                url: 'http://www.gstatic.com/generate_204',
                timeout: 3000,
                node: proxy.name
            }, (error, response) => {
                if (error) {
                    proxy.name = `[错误] ${proxy.name}`;
                } else {
                    const delay = Date.now() - startTime;
                    proxy.name = delay > 0 ? `[${delay}ms] ${proxy.name}` : `[超时] ${proxy.name}`;
                }
                
                completedTests++;
                if (completedTests === proxies.length) {
                    // 所有测试完成后排序
                    const sortedNodes = nodes.sort((a, b) => {
                        const delayA = parseInt(a.name.match(/\[(\d+)ms/)?.[1] || '9999');
                        const delayB = parseInt(b.name.match(/\[(\d+)ms/)?.[1] || '9999');
                        return delayA - delayB;
                    });
                    resolve(sortedNodes);
                }
            });
            
            return proxy;
        });
    });
}

module.exports = { operator }; 
