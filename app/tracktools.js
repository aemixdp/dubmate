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
    title = cutBraces(title).toLowerCase();
    var result = '';
    for (var char of title) {
        if (char != char.toUpperCase()) {
            result += char;
        }
    }
    result = result.replace('feat', 'ft');
    return result.length > 3 ? result : title;
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

export {cutBraces, titlestamp, guessArtist};
