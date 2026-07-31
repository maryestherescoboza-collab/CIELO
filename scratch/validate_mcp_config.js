const fs = require('fs');
const path = 'C:\\Users\\user\\.gemini\\antigravity\\mcp_config.json';

try {
    const content = fs.readFileSync(path, 'utf8');
    console.log('File length:', content.length);
    const data = JSON.parse(content);
    console.log('JSON is valid');
    console.log(JSON.stringify(data, null, 2));
} catch (e) {
    console.error('JSON Error:', e.message);
    if (e.at) console.error('At:', e.at);
}
