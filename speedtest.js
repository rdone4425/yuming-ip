// 节点测速脚本 for Sub-Store
// 更新日期：2024-03-21

function operator(proxies) {
    // 直接返回处理后的节点列表
    return proxies.map(proxy => {
        // 添加延迟标记
        proxy.name = `[测试] ${proxy.name}`;
        return proxy;
    });
}

// 导出
module.exports = { operator }; 
