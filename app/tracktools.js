function cutBraces (string) {
    var result = '';
    var level = 0;
    for (var c of string) {
        if (c == '(' || c == '[')
            level++;
        else if (c == ')' || c == ']')
            level = Math.max(0, level - 1);
        else if (level == 0)
            result += c;
    }
    return result;
}

function titlestamp (title) {
    return cutBraces(title)
        .replace(/[^a-zA-Z]+/g, '')
        .toLowerCase()
        .replace('feat', 'ft');
}

export { cutBraces, titlestamp };
