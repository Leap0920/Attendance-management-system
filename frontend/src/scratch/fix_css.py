import sys

filepath = r'c:\codes\Attendance-management-system\frontend\src\styles\index.css'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Look for the corruption
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if '.stream-item-material .stream-info h4 {' in line:
        start_idx = i
    if 'color: var(--text-muted);' in line and start_idx != -1:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    new_lines = lines[:start_idx]
    new_lines.append('.stream-item-material .stream-info h4 {\n')
    new_lines.append('  font-size: 0.95rem;\n')
    new_lines.append('  font-weight: 500;\n')
    new_lines.append('  color: var(--text-primary);\n')
    new_lines.append('}\n')
    new_lines.append('.stream-item-material .stream-info p {\n')
    new_lines.append('  font-size: 0.75rem;\n')
    new_lines.extend(lines[end_idx:])
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Successfully fixed CSS corruption")
else:
    print(f"Could not find corruption pattern. Start: {start_idx}, End: {end_idx}")
