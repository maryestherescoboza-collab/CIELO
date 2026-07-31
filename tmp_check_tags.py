import sys

content = open(r'c:\Users\user\OneDrive\Escritorio\Evaluación por competencias\src\screens\Inicio.tsx', 'r', encoding='utf-8').read()

# Very primitive counter
opens = content.count('<div')
closes = content.count('</div>')

print(f"Opens: {opens}")
print(f"Closes: {closes}")

# Trace the return statement
start_index = content.find('return (')
if start_index != -1:
    body = content[start_index:]
    b_opens = body.count('<div')
    b_closes = body.count('</div>')
    print(f"Body Opens: {b_opens}")
    print(f"Body Closes: {b_closes}")
