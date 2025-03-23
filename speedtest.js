// 节点测速脚本 for Sub-Store
// 更新日期：2024-03-21

function operator(proxies) {
    const $ = new Env('SpeedTest');
    const results = [];
    
    // 测试配置
    const config = {
        pingUrl: 'http://www.gstatic.com/generate_204',
        timeout: 3000,
        pingCount: 3,  // 每个节点测试次数
        concurrency: 5, // 并发测试数
        sortBy: 'speed' // 'speed' 或 'delay'
    };
    
    // 开始测试
    $.log(`开始测速，共 ${proxies.length} 个节点`);
    
    // 批量测试节点
    const batchTest = async (nodes) => {
        const tasks = nodes.map(async (proxy) => {
            try {
                // 测试延迟
                const delays = [];
                for(let i = 0; i < config.pingCount; i++) {
                    const delay = await testDelay(proxy.name);
                    if(delay > 0) delays.push(delay);
                    await sleep(100);
                }
                
                // 计算平均延迟
                const avgDelay = delays.length > 0 
                    ? Math.round(delays.reduce((a, b) => a + b) / delays.length)
                    : 0;
                    
                // 测试速度
                const speed = avgDelay < 1000 ? await testSpeed(proxy.name) : 0;
                
                return {
                    ...proxy,
                    delay: avgDelay,
                    speed: speed
                };
                
            } catch (err) {
                $.log(`节点 ${proxy.name} 测试失败: ${err}`);
                return {
                    ...proxy,
                    delay: 0,
                    speed: 0
                };
            }
        });
        
        return Promise.all(tasks);
    };
    
    // 分批测试
    const batchSize = config.concurrency;
    for(let i = 0; i < proxies.length; i += batchSize) {
        const batch = proxies.slice(i, i + batchSize);
        const batchResults = await batchTest(batch);
        results.push(...batchResults);
        
        // 打印进度
        $.log(`测试进度: ${Math.min(i + batchSize, proxies.length)}/${proxies.length}`);
    }
    
    // 排序结果
    results.sort((a, b) => {
        if(config.sortBy === 'speed') {
            return b.speed - a.speed;
        }
        return a.delay - b.delay;
    });
    
    // 添加测速结果到节点名
    return results.map(node => {
        if(node.delay > 0) {
            node.name = `[${node.delay}ms ${node.speed.toFixed(1)}MB/s] ${node.name}`;
        } else {
            node.name = `[超时] ${node.name}`;
        }
        return node;
    });
}

// 测试延迟
async function testDelay(nodeName) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        $httpClient.get({
            url: "http://www.gstatic.com/generate_204",
            node: nodeName,
            timeout: 3000
        }, (error, response, data) => {
            if (error) {
                resolve(0);
            } else {
                resolve(Date.now() - startTime);
            }
        });
    });
}

// 测试速度
async function testSpeed(nodeName) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        let downloaded = 0;
        
        $httpClient.get({
            url: "http://cachefly.cachefly.net/10mb.test",
            node: nodeName,
            timeout: 5000,
            onProgress: (written, total) => {
                downloaded = written;
                if ((Date.now() - startTime) > 5000) {
                    resolve(downloaded / 1024 / 1024 / 5); // MB/s
                }
            }
        }, (error, response, data) => {
            if (error) {
                resolve(0);
            } else {
                resolve(downloaded / 1024 / 1024 / ((Date.now() - startTime) / 1000));
            }
        });
    });
}

// 工具函数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Env 类
function Env(name) {
    this.name = name;
    
    this.log = (msg) => {
        console.log(`[${this.name}] ${msg}`);
    };
    
    return this;
}

// 导出
module.exports = {
    operator
}; 
