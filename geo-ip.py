import requests
import json
from datetime import datetime

def fetch_ip_list():
    # 添加时间戳记录
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"开始更新IP列表 - {current_time}")
    
    # 设置请求URL
    url = "https://ip.rdone.me/list"
    
    try:
        # 发送GET请求
        response = requests.get(url)
        response.raise_for_status()  # 检查请求是否成功
        
        # 解析JSON响应
        data = response.json()
        
        # 提取IP和国家信息
        simplified_data = {
            "proxies": [
                {
                    "ip": proxy["ip"],
                    "country": proxy["country"]
                }
                for proxy in data["proxies"]
            ]
        }
        
        # 保存简化的JSON数据到固定文件名
        json_filename = "ip.json"
        with open(json_filename, 'w', encoding='utf-8') as f:
            json.dump(simplified_data, f, ensure_ascii=False, indent=2)
            
        # 添加更新时间到TXT文件
        txt_filename = "ip.txt"
        with open(txt_filename, 'w') as f:
            f.write(f"# 更新时间: {current_time}\n")
            for proxy in simplified_data["proxies"]:
                f.write(f"{proxy['ip']}\n")
                
        print(f"JSON数据已保存到: {json_filename}")
        print(f"IP列表已保存到: {txt_filename}")
        print(f"共 {len(simplified_data['proxies'])} 个IP地址")
        print(f"更新完成 - {current_time}")
        
    except requests.exceptions.RequestException as e:
        print(f"下载失败: {e}")
    except json.JSONDecodeError as e:
        print(f"JSON解析失败: {e}")
    except Exception as e:
        print(f"发生错误: {e}")

if __name__ == "__main__":
    fetch_ip_list()
