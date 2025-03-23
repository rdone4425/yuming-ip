// 节点测速脚本 for Sub-Store
// 更新日期：2024-03-21

function operator(proxies) {
    // 测速配置
    const config = {
        // 测试地址，可以添加多个，取最快的结果
        urls: [
            'http://www.gstatic.com/generate_204',
            'http://cp.cloudflare.com/generate_204',
            'http://www.qualcomm.cn/generate_204'
        ],
        timeout: 3000,         // 超时时间（毫秒）
        concurrent: 5,         // 并发数
        testCount: 1          // 每个节点测试次数
    };

    return new Promise((resolve) => {
        const results = [];
        let done = 0;
        let currentIndex = 0;

        // 测试单个节点
        function testNode(proxy) {
            const startTime = Date.now();
            let completed = false;

            // 创建测速Promise
            const speedTest = new Promise((resolve) => {
                $httpClient.get({
                    url: config.urls[0],
                    timeout: config.timeout,
                    node: proxy.name
                }, (error, response) => {
                    if (completed) return;
                    completed = true;

                    if (error) {
                        resolve({ delay: 0, error: true });
                    } else {
                        const delay = Date.now() - startTime;
                        resolve({ delay, error: false });
                    }
                });
            });

            // 超时处理
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                    if (completed) return;
                    completed = true;
                    resolve({ delay: 0, error: true });
                }, config.timeout);
            });

            // 测试完成后处理结果
            Promise.race([speedTest, timeoutPromise])
                .then(({ delay, error }) => {
                    if (error) {
                        proxy.name = `[超时] ${proxy.name}`;
                    } else {
                        proxy.name = `[${delay}ms] ${proxy.name}`;
                    }
                    results.push(proxy);

                    done++;
                    if (done === proxies.length) {
                        // 所有节点测试完成，按延迟排序
                        const sortedResults = results.sort((a, b) => {
                            const delayA = parseInt(a.name.match(/\[(\d+)ms/)?.[1] || '9999');
                            const delayB = parseInt(b.name.match(/\[(\d+)ms/)?.[1] || '9999');
                            return delayA - delayB;
                        });
                        resolve(sortedResults);
                    } else {
                        // 继续测试下一个节点
                        testNext();
                    }
                });
        }

        // 测试下一批节点
        function testNext() {
            while (currentIndex < proxies.length && 
                   (done + (results.length - done)) < config.concurrent) {
                testNode(proxies[currentIndex]);
                currentIndex++;
            }
        }

        // 开始测试
        testNext();
    });
}

module.exports = { operator }; 
