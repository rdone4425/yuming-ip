import requests
from datetime import datetime
import os

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
        
        # 设置保存路径
        save_dir = "yuming-ip/yuming-ip"
        os.makedirs(save_dir, exist_ok=True)
        txt_filename = os.path.join(save_dir, "ip.txt")
        
        # 解析响应并写入TXT文件
        data = response.json()
        with open(txt_filename, 'w') as f:
            for proxy in data["proxies"]:
                f.write(f"{proxy['ip']}\n")
                
        print(f"IP列表已保存到: {txt_filename}")
        print(f"共 {len(data['proxies'])} 个IP地址")
        print(f"更新完成 - {current_time}")
        
    except requests.exceptions.RequestException as e:
        print(f"下载失败: {e}")
    except Exception as e:
        print(f"发生错误: {e}")

if __name__ == "__main__":
    fetch_ip_list()
