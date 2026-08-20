import os

target = r"D:\小零\xiao.bat"
link_path = r"C:\Users\ASUS\Desktop\小零.url"

with open(link_path, 'w', encoding='utf-8') as f:
    f.write('[InternetShortcut]\n')
    file_url = 'file:///D:/%E5%B0%8F%E9%9B%B6/xiao.bat'
    f.write(f'URL={file_url}\n')
    f.write('IconIndex=0\n')

print(f'Created shortcut: {link_path}')
