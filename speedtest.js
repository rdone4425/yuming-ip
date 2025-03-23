// 节点测速脚本 for Sub-Store
// 更新日期：2024-03-21

async function operator(proxies) {
    // 获取所有节点
    const nodes = await Promise.all(proxies.map(async proxy => {
        try {
            // 测试延迟
            const startTime = Date.now();
            const response = await new Promise((resolve, reject) => {
                $httpClient.get({
                    url: 'http://www.gstatic.com/generate_204',
                    timeout: 3000,
                    node: proxy.name
                }, (error, response) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(response);
                    }
                });
            });
            
            const delay = Date.now() - startTime;
            
            // 添加延迟标记
            if (delay > 0) {
                proxy.name = `[${delay}ms] ${proxy.name}`;
            } else {
                proxy.name = `[超时] ${proxy.name}`;
            }
            
        } catch (err) {
            proxy.name = `[错误] ${proxy.name}`;
        }
        
        return proxy;
    }));
    
    // 按延迟排序
    return nodes.sort((a, b) => {
        const delayA = parseInt(a.name.match(/\[(\d+)ms/)?.[1] || '9999');
        const delayB = parseInt(b.name.match(/\[(\d+)ms/)?.[1] || '9999');
        return delayA - delayB;
    });
}

// 导出
module.exports = { operator }; 
