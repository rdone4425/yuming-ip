const $ = new Env("NodeSpeedTest");
const tolerance = $.read("tolerance") || 100;
const timecache = $.read("timecache") || 18000;

// 主函数
!(async () => {
    try {
        // 获取所有策略组
        const policyGroups = await $config.getSubPolicies();
        const results = [];
        let totalNodes = 0;
        
        // 遍历每个策略组获取节点
        for (let group of policyGroups) {
            const nodes = group.nodes;
            totalNodes += nodes.length;
            
            $.notify("开始测速", "", `策略组: ${group.name}, 共 ${nodes.length} 个节点`);
            
            // 测试该组的所有节点
            for (let node of nodes) {
                try {
                    // 测试延迟
                    const delay = await testDelay(node);
                    
                    // 测试速度
                    const speed = await testSpeed(node);
                    
                    results.push({
                        group: group.name,
                        node: node,
                        delay: delay,
                        speed: speed
                    });
                    
                } catch (err) {
                    console.log(`节点 ${node} 测试失败: ${err}`);
                    results.push({
                        group: group.name,
                        node: node,
                        delay: -1,
                        speed: -1
                    });
                }
                
                // 每个节点测试间隔1秒
                await sleep(1000);
            }
        }
        
        // 结果排序和显示
        results.sort((a, b) => {
            if (a.delay === -1) return 1;
            if (b.delay === -1) return -1;
            return a.delay - b.delay;
        });
        
        // 生成报告
        let report = "测速报告:\n\n";
        let currentGroup = "";
        
        for (let result of results) {
            if (currentGroup !== result.group) {
                currentGroup = result.group;
                report += `\n${currentGroup}:\n`;
            }
            
            if (result.delay === -1) {
                report += `${result.node}: 测试失败\n`;
            } else {
                report += `${result.node}: 延迟 ${result.delay}ms, 速度 ${result.speed.toFixed(2)}MB/s\n`;
            }
        }
        
        $.notify("测速完成", `共测试 ${totalNodes} 个节点`, report);
        
    } catch (err) {
        console.log("测速过程发生错误:", err);
        $.notify("测速失败", "", err.toString());
    }
})();

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
                reject(error);
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
                reject(error);
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
    
    this.notify = (title, subtitle, message) => {
        $notification.post(title, subtitle, message);
    };
    
    return this;
}

// Loon API
function API(t="untitled",s=!1){return new class{constructor(t,s){this.name=t,this.debug=s,this.isQX="undefined"!=typeof $task,this.isLoon="undefined"!=typeof $loon,this.isSurge="undefined"!=typeof $httpClient&&!this.isLoon,this.isNode="function"==typeof require,this.isJSBox=this.isNode&&"undefined"!=typeof $jsbox,this.node=(()=>this.isNode?{request:"undefined"!=typeof $request?void 0:require("request"),fs:require("fs")}:null)(),this.cache=this.initCache(),this.log(`INITIAL CACHE:\n${JSON.stringify(this.cache)}`),Promise.prototype.delay=function(t){return this.then(function(s){return((t,s)=>new Promise(function(e){setTimeout(e.bind(null,s),t)}))(t,s)})}}get(t){return this.isQX?("string"==typeof t&&(t={url:t,method:"GET"}),$task.fetch(t)):new Promise((s,e)=>{this.isLoon||this.isSurge?$httpClient.get(t,(t,i,o)=>{t?e(t):s({status:i.status,headers:i.headers,body:o})}):this.node.request(t,(t,i,o)=>{t?e(t):s({...i,status:i.statusCode,body:o})})})}post(t){return this.isQX?("string"==typeof t&&(t={url:t}),t.method="POST",$task.fetch(t)):new Promise((s,e)=>{this.isLoon||this.isSurge?$httpClient.post(t,(t,i,o)=>{t?e(t):s({status:i.status,headers:i.headers,body:o})}):this.node.request.post(t,(t,i,o)=>{t?e(t):s({...i,status:i.statusCode,body:o})})})}initCache(){if(this.isQX)return JSON.parse($prefs.valueForKey(this.name)||"{}");if(this.isLoon||this.isSurge)return JSON.parse($persistentStore.read(this.name)||"{}");if(this.isNode){const t=`${this.name}.json`;return this.node.fs.existsSync(t)?JSON.parse(this.node.fs.readFileSync(`${this.name}.json`)):(this.node.fs.writeFileSync(t,JSON.stringify({}),{flag:"wx"},t=>console.log(t)),{})}}persistCache(){const t=JSON.stringify(this.cache);this.log(`FLUSHING DATA:\n${t}`),this.isQX&&$prefs.setValueForKey(t,this.name),(this.isLoon||this.isSurge)&&$persistentStore.write(t,this.name),this.isNode&&this.node.fs.writeFileSync(`${this.name}.json`,t,{flag:"w"},t=>console.log(t))}write(t,s){this.log(`SET ${s} = ${JSON.stringify(t)}`),this.cache[s]=t,this.persistCache()}read(t){return this.log(`READ ${t} ==> ${JSON.stringify(this.cache[t])}`),this.cache[t]}delete(t){this.log(`DELETE ${t}`),delete this.cache[t],this.persistCache()}notify(t,s,e,i){const o="string"==typeof i?i:void 0,n=e+(null==o?"":`\n${o}`);this.isQX&&(void 0!==o?$notify(t,s,e,{"open-url":o}):$notify(t,s,e,i)),this.isSurge&&$notification.post(t,s,n),this.isLoon&&$notification.post(t,s,e),this.isNode&&(this.isJSBox?require("push").schedule({title:t,body:s?s+"\n"+e:e}):console.log(`${t}\n${s}\n${n}\n\n`))}log(t){this.debug&&console.log(t)}info(t){console.log(t)}error(t){console.log("ERROR: "+t)}wait(t){return new Promise(s=>setTimeout(s,t))}done(t={}){this.isQX||this.isLoon||this.isSurge?$done(t):this.isNode&&!this.isJSBox&&"undefined"!=typeof $context&&($context.headers=t.headers,$context.statusCode=t.statusCode,$context.body=t.body)}}(t,s)} 
