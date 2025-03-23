// 节点测速脚本 for Sub-Store
// 更新日期：2024-03-21

function operator(proxies) {
    // 测试延迟
    function testDelay(nodeName) {
        const startTime = Date.now();
        const response = $httpClient.get({
            url: 'http://www.gstatic.com/generate_204',
            timeout: 3000
        });
        
        if (response.error) {
            return 0;
        }
        return Date.now() - startTime;
    }
    
    // 处理节点
    proxies.forEach(proxy => {
        const delay = testDelay(proxy.name);
        if (delay > 0) {
            proxy.name = `[${delay}ms] ${proxy.name}`;
        } else {
            proxy.name = `[超时] ${proxy.name}`;
        }
    });
    
    // 排序
    return proxies.sort((a, b) => {
        const delayA = parseInt(a.name.match(/\[(\d+)ms/)?.[1] || '9999');
        const delayB = parseInt(b.name.match(/\[(\d+)ms/)?.[1] || '9999');
        return delayA - delayB;
    });
}

// 导出
module.exports = {
    operator
}; 
