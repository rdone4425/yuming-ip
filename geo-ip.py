import requests
import json
import os
from urllib.parse import urlparse

def get_files(rule_type):
    """获取不同类型的规则文件并按目录分类保存
    
    Args:
        rule_type: 规则类型 ('asn', 'geo-geoip', 'geo-geosite', 'geo-lite-geoip', 'geo-lite-geosite')
    """
    config = {
        'asn': {
            'path': 'asn',
            'output': 'asn_files.json',
            'filter_start': 'AS',
            'group_files': False
        },
        'geo-geoip': {
            'path': 'geo/geoip',
            'output': 'geo_geoip_files.json',
            'group_files': True
        },
        'geo-geosite': {
            'path': 'geo/geosite',
            'output': 'geo_geosite_files.json',
            'group_files': True
        },
        'geo-lite-geoip': {
            'path': 'geo-lite/geoip',
            'output': 'geoip_files.json',
            'group_files': True
        },
        'geo-lite-geosite': {
            'path': 'geo-lite/geosite',
            'output': 'geosite_files.json',
            'group_files': True
        }
    }
    
    if rule_type not in config:
        print(f"不支持的规则类型: {rule_type}")
        return
        
    settings = config[rule_type]
    url = f"https://api.github.com/repos/rdone4425/meta-rules-dat/contents/{settings['path']}?ref=meta"
    
    try:
        headers = {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': f"token {os.environ.get('GITHUB_TOKEN')}"
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        files = response.json()
        all_rules = {}  # 用于存储所有规则
        
        if settings['group_files']:
            # 处理所有文件
            for file in files:
                if file['type'] == 'dir':
                    continue
                    
                download_url = file['download_url']
                file_name = os.path.splitext(file['name'])[0]  # 去除扩展名
                
                # 获取规则文件内容
                try:
                    rule_response = requests.get(download_url)
                    rule_response.raise_for_status()
                    rule_content = rule_response.text
                    
                    # 提取URL（以+.开头的行）
                    urls = [line.strip()[2:] for line in rule_content.split('\n') 
                           if line.strip().startswith('+.')]
                    
                    # 根据规则类型确定目录路径
                    if 'geo-lite' in rule_type:
                        directory = 'geo-lite'
                        sub_type = rule_type.split('-')[-1]  # geoip 或 geosite
                    else:
                        directory = 'geo'
                        sub_type = rule_type.split('-')[-1]  # geoip 或 geosite
                    
                    # 构建规则分类
                    if directory not in all_rules:
                        all_rules[directory] = {}
                    if sub_type not in all_rules[directory]:
                        all_rules[directory][sub_type] = {}
                    
                    # 保存规则内容
                    all_rules[directory][sub_type][file_name] = sorted(urls)  # 排序URLs
                    
                except Exception as e:
                    print(f"获取规则内容失败 {file_name}: {e}")
                    continue
            
            # 保存所有规则到一个JSON文件
            all_rules_path = os.path.join('rules', 'all_rules.json')
            os.makedirs(os.path.dirname(all_rules_path), exist_ok=True)
            
            # 如果文件已存在，先读取现有内容
            if os.path.exists(all_rules_path):
                with open(all_rules_path, 'r', encoding='utf-8') as f:
                    existing_rules = json.load(f)
                # 更新现有规则
                for directory in all_rules:
                    if directory not in existing_rules:
                        existing_rules[directory] = {}
                    for sub_type in all_rules[directory]:
                        existing_rules[directory][sub_type] = all_rules[directory][sub_type]
                all_rules = existing_rules
            
            # 保存更新后的规则
            with open(all_rules_path, 'w', encoding='utf-8') as f:
                json.dump(all_rules, f, indent=4, ensure_ascii=False)
            
            print(f"已更新规则到 all_rules.json: {rule_type}")
            
        else:
            # ASN规则特殊处理
            asn_files = {}
            
            for file in files:
                if (file['name'].startswith(settings.get('filter_start', '')) and 
                    (file['name'].endswith('.list') or file['name'].endswith('.mrs'))):
                    file_name = os.path.splitext(file['name'])[0]
                    if file_name not in asn_files:
                        asn_files[file_name] = {
                            "urls": [],
                            "directory": f"rules/{rule_type}/{file_name}"
                        }
                    asn_files[file_name]["urls"].append(file['download_url'])
            
            # 保存ASN文件列表
            output_path = os.path.join('rules', settings['output'])
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump({"asn_files": asn_files}, f, indent=4, ensure_ascii=False)

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        return []

def create_all_names_json():
    """创建一个包含所有类型规则名称的总JSON文件"""
    all_names = {}
    rule_types = ['asn', 'geo-geoip', 'geo-geosite', 'geo-lite-geoip', 'geo-lite-geosite']
    names_dir = 'rules_names'
    
    for rule_type in rule_types:
        names_path = os.path.join(names_dir, f'{rule_type}_names.json')
        if os.path.exists(names_path):
            with open(names_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                all_names.update(data)
    
    # 保存总的名称文件
    with open(os.path.join(names_dir, 'all_names.json'), 'w', encoding='utf-8') as f:
        json.dump(all_names, f, indent=4, ensure_ascii=False)

if __name__ == "__main__":
    # 获取所有类型的规则文件
    rule_types = ['asn', 'geo-geoip', 'geo-geosite', 'geo-lite-geoip', 'geo-lite-geosite']
    for rule_type in rule_types:
        get_files(rule_type)
    
    # 创建总的名称文件
    create_all_names_json()
