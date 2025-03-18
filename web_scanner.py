import os
import sys
import requests
import concurrent.futures
import time
import json
import argparse
from urllib3.exceptions import InsecureRequestWarning
from requests.exceptions import RequestException

# 禁用 SSL 警告
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

class WebScanner:
    def __init__(self, config=None):
        self.config = {
            'thread_count': 50,
            'timeout': 5,
            'output_dir': 'result',
            'http_ports': [80, 8080, 8880, 2052, 2082, 2086],
            'https_ports': [443, 2053, 2083, 2087, 2096, 8443, 2095]
        }
        if config:
            self.config.update(config)
        
        # 确保输出目录存在
        if not os.path.exists(self.config['output_dir']):
            os.makedirs(self.config['output_dir'])

    def check_url(self, ip, scheme="http", port=None):
        """检查单个URL的可访问性"""
        url = f"{scheme}://{ip}"
        if port:
            url = f"{url}:{port}"
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(
                url, 
                timeout=self.config['timeout'], 
                verify=False,
                headers=headers,
                allow_redirects=True
            )
            return {
                'url': url,
                'status': response.status_code,
                'success': True
            }
        except RequestException as e:
            return {
                'url': url,
                'status': 'ERROR',
                'error_msg': str(e),
                'success': False
            }

    def scan_ip(self, ip):
        """扫描单个IP的所有端口"""
        results = {'ip': ip}
        
        # 检查 HTTP 端口
        for port in self.config['http_ports']:
            key = f'http_{port}'
            results[key] = self.check_url(ip, "http", port if port != 80 else None)
        
        # 检查 HTTPS 端口
        for port in self.config['https_ports']:
            key = f'https_{port}'
            results[key] = self.check_url(ip, "https", port if port != 443 else None)
        
        return results

    def run(self, ip_file):
        """运行扫描程序"""
        print(f"\n{'-' * 50}")
        print(f"WebScanner v1.0")
        print(f"线程数：{self.config['thread_count']}")
        print(f"超时时间：{self.config['timeout']}秒")
        print(f"{'-' * 50}\n")

        # 读取IP列表
        try:
            with open(ip_file, 'r') as f:
                ips = [line.strip() for line in f.readlines() if line.strip()]
        except FileNotFoundError:
            print(f"错误: 找不到文件 '{ip_file}'")
            return

        print(f"加载了 {len(ips)} 个IP地址")
        print("开始扫描...\n")
        start_time = time.time()

        # 准备输出文件
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        output_files = {
            'http': os.path.join(self.config['output_dir'], f'http_available_{timestamp}.txt'),
            'https': os.path.join(self.config['output_dir'], f'https_available_{timestamp}.txt'),
            'all': os.path.join(self.config['output_dir'], f'all_available_{timestamp}.txt'),
            'json': os.path.join(self.config['output_dir'], f'full_results_{timestamp}.json')
        }

        results_data = []
        with open(output_files['http'], 'w') as http_f, \
             open(output_files['https'], 'w') as https_f, \
             open(output_files['all'], 'w') as all_f:

            with concurrent.futures.ThreadPoolExecutor(max_workers=self.config['thread_count']) as executor:
                future_to_ip = {executor.submit(self.scan_ip, ip): ip for ip in ips}
                completed = 0
                
                for future in concurrent.futures.as_completed(future_to_ip):
                    completed += 1
                    try:
                        results = future.result()
                        ip = results['ip']
                        results_data.append(results)

                        # 检查可用性
                        http_available = any(
                            results[f'http_{port}']['success'] and 
                            str(results[f'http_{port}']['status']).startswith(('2', '3', '4'))
                            for port in self.config['http_ports']
                        )
                        
                        https_available = any(
                            results[f'https_{port}']['success'] and 
                            str(results[f'https_{port}']['status']).startswith(('2', '3', '4'))
                            for port in self.config['https_ports']
                        )

                        # 写入结果
                        if http_available:
                            http_f.write(f"{ip}\n")
                            http_f.flush()
                        
                        if https_available:
                            https_f.write(f"{ip}\n")
                            https_f.flush()
                        
                        if http_available and https_available:
                            all_f.write(f"{ip}\n")
                            all_f.flush()

                        # 显示进度
                        progress = (completed / len(ips)) * 100
                        print(f"\r当前进度：{progress:.1f}% ({completed}/{len(ips)})", end='')
                        
                    except Exception as e:
                        print(f"\n{ip} 扫描出错: {str(e)}")

        # 保存完整结果到JSON文件
        with open(output_files['json'], 'w') as f:
            json.dump(results_data, f, indent=2)

        end_time = time.time()
        duration = end_time - start_time
        
        print(f"\n\n扫描完成！用时: {duration:.2f} 秒")
        print(f"\n结果文件：")
        print(f"- HTTP可用: {output_files['http']}")
        print(f"- HTTPS可用: {output_files['https']}")
        print(f"- 双协议可用: {output_files['all']}")
        print(f"- 完整结果: {output_files['json']}")

def main():
    parser = argparse.ArgumentParser(description='Web端口扫描工具')
    parser.add_argument('-f', '--file', default='ip.txt', help='IP列表文件路径 (默认: ip.txt)')
    parser.add_argument('-t', '--threads', type=int, default=50, help='线程数 (默认: 50)')
    parser.add_argument('-o', '--timeout', type=int, default=5, help='超时时间(秒) (默认: 5)')
    parser.add_argument('-d', '--dir', default='result', help='结果保存目录 (默认: result)')
    
    args = parser.parse_args()

    config = {
        'thread_count': args.threads,
        'timeout': args.timeout,
        'output_dir': args.dir
    }

    scanner = WebScanner(config)
    scanner.run(args.file)

if __name__ == "__main__":
    main() 
