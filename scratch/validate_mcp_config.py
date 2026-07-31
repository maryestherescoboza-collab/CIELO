import json
import sys

def validate_json(file_path):
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
            # Check for BOM
            if content.startswith(b'\xef\xbb\xbf'):
                print("Found UTF-8 BOM")
                content = content[3:]
            
            # Try to parse
            data = json.loads(content.decode('utf-8'))
            print("JSON is valid")
            print(json.dumps(data, indent=2))
            return data
    except json.JSONDecodeError as e:
        print(f"JSON Decode Error: {e}")
        print(f"Line: {e.lineno}, Col: {e.colno}")
        # Print the context
        lines = content.decode('utf-8').splitlines()
        if e.lineno <= len(lines):
            print(f"Offending line: {lines[e.lineno-1]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    validate_json(r'C:\Users\user\.gemini\antigravity\mcp_config.json')
