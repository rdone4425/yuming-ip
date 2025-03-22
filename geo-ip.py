import requests
import json
import os
from urllib.parse import urlparse

def get_files(rule_type):
    """获取不同类型的规则文件并按文件名分类保存
    
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
        file_data = {}
        file_names = set()  # 用于收集所有文件名
        
        if settings['group_files']:
            # 按文件类型和名称分组
            for file in files:
                if file['type'] == 'dir':
                    continue
                    
                download_url = file['download_url']
                file_name = os.path.splitext(file['name'])[0]  # 去除扩展名
                file_names.add(file_name)  # 添加到文件名集合
                
                # 确定文件类型
                if file['name'].endswith('.list'):
                    file_type = 'list_files'
                elif file['name'].endswith('.mrs'):
                    file_type = 'mrs_files'
                elif file['name'].endswith('.yaml'):
                    file_type = 'yaml_files'
                else:
                    continue
                
                # 初始化文件类型字典
                if file_type not in file_data:
                    file_data[file_type] = {}
                
                # 将URL和目录名添加到对应的文件名分组中
                if file_name not in file_data[file_type]:
                    file_data[file_type][file_name] = {
                        "urls": [],
                        "directory": f"rules/{rule_type}/{file_name}"
                    }
                file_data[file_type][file_name]["urls"].append(download_url)
                
            # 对每个分组中的URL列表进行排序
            for file_type in file_data:
                if isinstance(file_data[file_type], dict):
                    for file_name in file_data[file_type]:
                        file_data[file_type][file_name]["urls"] = sorted(file_data[file_type][file_name]["urls"])
            
            # 将数据写入JSON文件
            output_path = os.path.join('rules', settings['output'])
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(file_data, f, indent=4, ensure_ascii=False)
                
        else:
            # ASN规则特殊处理
            asn_files = {}
            
            for file in files:
                if (file['name'].startswith(settings.get('filter_start', '')) and 
                    (file['name'].endswith('.list') or file['name'].endswith('.mrs'))):
                    file_name = os.path.splitext(file['name'])[0]
                    file_names.add(file_name)  # 添加到文件名集合
                    if file_name not in asn_files:
                        asn_files[file_name] = {
                            "urls": [],
                            "directory": f"rules/{rule_type}/{file_name}"
                        }
                    asn_files[file_name]["urls"].append(file['download_url'])
            
            # 对每个ASN的URL列表进行排序
            for asn in asn_files:
                asn_files[asn]["urls"] = sorted(asn_files[asn]["urls"])
            
            # 保存ASN文件列表
            output_path = os.path.join('rules', settings['output'])
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump({"asn_files": asn_files}, f, indent=4, ensure_ascii=False)
        
        # 创建包含所有文件名称的JSON文件
        names_dir = 'rules_names'
        os.makedirs(names_dir, exist_ok=True)
        names_path = os.path.join(names_dir, f'{rule_type}_names.json')
        with open(names_path, 'w', encoding='utf-8') as f:
            json.dump({f"{rule_type}_names": sorted(list(file_names))}, f, indent=4, ensure_ascii=False)
            
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
