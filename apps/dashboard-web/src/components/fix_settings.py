#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Apply Change 2 - add isLocked to items map settings button className"""

path = 'C:/Users/Dream/ray-eg-1/apps/dashboard-web/src/components/Sidebar.tsx'

with open(path, 'rb') as f:
    data = f.read()

content = data.decode('utf-8')
original = content

# Normalize line endings
content_norm = content.replace('\r\n', '\n')

# Change 2: Add isLocked to items map settings button className
old2 = """const isSettings = !isAlreadyInSettings && (item.href.startsWith('/dashboard/settings') || item.id.toLowerCase().endsWith('settings'));
                const isLocked = isClosed;

                if (isSettings) {
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (onClose) onClose();
                        const { tab, from } = parseSettingsHref(item.href);
                        openModal(tab, from || section.id);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${active
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                      style={{ margin: '0 0.75rem', width: 'calc(100% - 1.5rem)' }}
                    >"""

new2 = """const isSettings = !isAlreadyInSettings && (item.href.startsWith('/dashboard/settings') || item.id.toLowerCase().endsWith('settings'));
                const isLocked = isClosed;

                if (isSettings) {
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (onClose) onClose();
                        const { tab, from } = parseSettingsHref(item.href);
                        openModal(tab, from || section.id);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isLocked ? 'opacity-60 cursor-not-allowed' : ''} ${active
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                      style={{ margin: '0 0.75rem', width: 'calc(100% - 1.5rem)' }}
                    >"""

if old2 in content_norm:
    content_norm = content_norm.replace(old2, new2)
    print('Change 2: OK')
else:
    print('Change 2: FAILED')

if content_norm != content:
    content_out = content_norm.replace('\n', '\r\n')
    with open(path, 'wb') as f:
        f.write(content_out.encode('utf-8'))
    print('File written')
else:
    print('No changes needed')
