const fs = require('fs');

const content = fs.readFileSync('c:/Users/user/OneDrive/Escritorio/EvaluaciÃ³n por competencias/src/screens/Cotejo.tsx', 'utf8');

function checkTags(text) {
    const stack = [];
    const tags = text.match(/<(\/?[a-zA-Z0-9]+)(\s|>)/g) || [];
    
    // Simple tag balancer for common HTML tags in JSX
    for (let tag of tags) {
        tag = tag.replace(/[\s>]/, '');
        if (tag.startsWith('<img') || tag.startsWith('<input') || tag.startsWith('<br') || tag.startsWith('<hr')) continue;
        
        if (tag.startsWith('</')) {
            const closing = tag.substring(2);
            if (stack.length === 0) {
                console.log('Extra closing tag: ' + tag);
                continue;
            }
            const opening = stack.pop();
            if (opening !== closing) {
                console.log('Mismatch: Expected </' + opening + '> but found ' + tag);
            }
        } else {
            stack.push(tag.substring(1));
        }
    }
    console.log('Stack at end:', stack);
}

checkTags(content);
