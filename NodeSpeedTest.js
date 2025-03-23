const $ = API("NodeSpeedTest");
const tolerance = $.read("tolerance") || 100;
const timecache = $.read("timecache") || 18000;

!(async () => {
  // 获取所有节点
  const proxies = await $.getProxies();
  const results = [];
  
  for (let proxy of proxies) {
    try {
      // 测试延迟
      const delay = await testDelay(proxy);
      
      // 测试下载速度
      const speed = await testSpeed(proxy);
      
      results.push({
        name: proxy.name,
        delay: delay,
        speed: speed
      });
    } catch (err) {
      console.log(`测试节点 ${proxy.name} 时发生错误: ${err}`);
    }
  }
  
  // 排序并显示结果
  results.sort((a, b) => a.delay - b.delay);
  
  let notification = "节点测速结果:\n";
  results.forEach(result => {
    notification += `${result.name}: 延迟 ${result.delay}ms, 速度 ${result.speed}MB/s\n`;
  });
  
  $.notify("节点测速完成", "", notification);
})();

// 测试节点延迟
async function testDelay(proxy) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    $.http.get({
      url: "http://www.gstatic.com/generate_204",
      proxy: proxy.name
    })
    .then(() => {
      const delay = Date.now() - start;
      resolve(delay);
    })
    .catch(err => reject(err));
  });
}

// 测试下载速度
async function testSpeed(proxy) {
  return new Promise((resolve, reject) => {
    const testFile = "http://cachefly.cachefly.net/10mb.test";
    const start = Date.now();
    let downloaded = 0;
    
    $.http.get({
      url: testFile,
      proxy: proxy.name,
      onProgress: (written, total) => {
        downloaded = written;
        if (Date.now() - start > 5000) { // 5秒超时
          resolve(downloaded / 1024 / 1024 / 5); // 转换为 MB/s
        }
      }
    })
    .catch(err => reject(err));
  });
}

// Loon API
function API(t="untitled",s=!1){return new class{constructor(t,s){this.name=t,this.debug=s,this.isQX="undefined"!=typeof $task,this.isLoon="undefined"!=typeof $loon,this.isSurge="undefined"!=typeof $httpClient&&!this.isLoon,this.isNode="function"==typeof require,this.isJSBox=this.isNode&&"undefined"!=typeof $jsbox,this.node=(()=>this.isNode?{request:"undefined"!=typeof $request?void 0:require("request"),fs:require("fs")}:null)(),this.cache=this.initCache(),this.log(`INITIAL CACHE:\n${JSON.stringify(this.cache)}`),Promise.prototype.delay=function(t){return this.then(function(s){return((t,s)=>new Promise(function(e){setTimeout(e.bind(null,s),t)}))(t,s)})}}get(t){return this.isQX?("string"==typeof t&&(t={url:t,method:"GET"}),$task.fetch(t)):new Promise((s,e)=>{this.isLoon||this.isSurge?$httpClient.get(t,(t,i,o)=>{t?e(t):s({status:i.status,headers:i.headers,body:o})}):this.node.request(t,(t,i,o)=>{t?e(t):s({...i,status:i.statusCode,body:o})})})}post(t){return this.isQX?("string"==typeof t&&(t={url:t}),t.method="POST",$task.fetch(t)):new Promise((s,e)=>{this.isLoon||this.isSurge?$httpClient.post(t,(t,i,o)=>{t?e(t):s({status:i.status,headers:i.headers,body:o})}):this.node.request.post(t,(t,i,o)=>{t?e(t):s({...i,status:i.statusCode,body:o})})})}initCache(){if(this.isQX)return JSON.parse($prefs.valueForKey(this.name)||"{}");if(this.isLoon||this.isSurge)return JSON.parse($persistentStore.read(this.name)||"{}");if(this.isNode){const t=`${this.name}.json`;return this.node.fs.existsSync(t)?JSON.parse(this.node.fs.readFileSync(`${this.name}.json`)):(this.node.fs.writeFileSync(t,JSON.stringify({}),{flag:"wx"},t=>console.log(t)),{})}}persistCache(){const t=JSON.stringify(this.cache);this.log(`FLUSHING DATA:\n${t}`),this.isQX&&$prefs.setValueForKey(t,this.name),(this.isLoon||this.isSurge)&&$persistentStore.write(t,this.name),this.isNode&&this.node.fs.writeFileSync(`${this.name}.json`,t,{flag:"w"},t=>console.log(t))}write(t,s){this.log(`SET ${s} = ${JSON.stringify(t)}`),this.cache[s]=t,this.persistCache()}read(t){return this.log(`READ ${t} ==> ${JSON.stringify(this.cache[t])}`),this.cache[t]}delete(t){this.log(`DELETE ${t}`),delete this.cache[t],this.persistCache()}notify(t,s,e,i){const o="string"==typeof i?i:void 0,n=e+(null==o?"":`\n${o}`);this.isQX&&(void 0!==o?$notify(t,s,e,{"open-url":o}):$notify(t,s,e,i)),this.isSurge&&$notification.post(t,s,n),this.isLoon&&$notification.post(t,s,e),this.isNode&&(this.isJSBox?require("push").schedule({title:t,body:s?s+"\n"+e:e}):console.log(`${t}\n${s}\n${n}\n\n`))}log(t){this.debug&&console.log(t)}info(t){console.log(t)}error(t){console.log("ERROR: "+t)}wait(t){return new Promise(s=>setTimeout(s,t))}done(t={}){this.isQX||this.isLoon||this.isSurge?$done(t):this.isNode&&!this.isJSBox&&"undefined"!=typeof $context&&($context.headers=t.headers,$context.statusCode=t.statusCode,$context.body=t.body)}}(t,s)} 
