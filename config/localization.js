const ru = {
    'About': 'Общее',
    'Links': 'Ссылки',
    'Playlist': 'Плейлист',
    'Users': 'Пользователи',
    'Messages': 'Сообщения',
    'Message': 'Сообщение',
    'Commands': 'Комманды',
    'Command': 'Комманда',
    'Description': 'Описание',
    'Title': 'Название',
    'Total plays': 'Всего воспроизведений',
    'DJ': 'DJ',
    'Previous DJ': 'Предыдущий DJ',
    'Date': 'Дата',
    'Username': 'Ник',
    'Plays': 'Воспроизведений',
    'First seen': 'Первое посещение',
    'Last seen': 'Последнее посещение',
    'First play': 'Первый диджеинг',
    'Last play': 'Последний диджеинг',
    'ru': 'рус',
    'en': 'англ',
    'get a random picture of a cat': 'получить случайную пикчу кота',
    'roll a genre for your next track': 'ролльнуть жанр для следующего трека',
    'display track plays info for given title, if specified, otherwise for current track':
        'показать информацию о воспроизведениях для указанного либо текущего трека',
    'if artistname specified, get artist tags from lastfm, otherwise get current track tags from youtube/soundcloud':
        'если имя артиста указано, получить теги с ластика, иначе получить теги текущего трека с youtube/soundcloud'
};

export default (locale) => {
    var dictionary = {};
    if (locale == 'ru') {
        dictionary = ru;
    }
    return (text) =>
        dictionary[text] || text;
};
