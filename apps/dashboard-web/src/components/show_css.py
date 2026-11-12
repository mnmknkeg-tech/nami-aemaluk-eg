#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Show the items map settings button className"""

path = 'C:/Users/Dream/ray-eg-1/apps/dashboard-web/src/components/Sidebar.tsx'

with open(path, 'rb') as f:
    data = f.read()

content = data.decode('utf-8')
content_norm = content.replace('\r\n', '\n')

# Find the items map settings button className
idx = content_norm.find('const isSettings = !isAlreadyInSettings && (item.href')
if idx != -1:
    btn_idx = content_norm.find('<button', idx)
    if btn_idx != -1:
        className_idx = content_norm.find('className', btn_idx)
        if className_idx != -1:
            end_idx = content_norm.find('`', className_idx)
            if end_idx != -1:
                print('Settings button className:')
                print(repr(content_norm[className_idx:end_idx+160]))
