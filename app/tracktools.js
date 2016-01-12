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

function guessArtist (title) {
    var sepIndex = title.indexOf(' - ');
    if (sepIndex == -1) sepIndex = title.indexOf(' _ ');
    if (sepIndex == -1) sepIndex = title.indexOf(' | ');
    if (sepIndex == -1) sepIndex = title.indexOf(': ');
    if (sepIndex == -1) sepIndex = title.indexOf('. ');
    if (sepIndex == -1) sepIndex = title.indexOf('_ ');
    if (sepIndex == -1) sepIndex = title.indexOf('| ');
    if (sepIndex == -1) sepIndex = title.indexOf('- ');
    if (sepIndex == -1) sepIndex = title.indexOf('-');
    if (sepIndex == -1) sepIndex = title.indexOf(' ');
    var artist = sepIndex == -1 ? title : title.substr(0, sepIndex);
    return artist.trim();
}

export { cutBraces, titlestamp, guessArtist };
