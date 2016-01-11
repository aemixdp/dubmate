$(function () {
    $('.pagination .disabled a, .pagination .active a').on('click', function(e) {
        e.preventDefault();
    });

    $('[data-datetime]').each(function () {
        var dateTime = $(this).attr('data-datetime');
        if (!dateTime) return;
        var localDate = new Date(parseInt(dateTime));
        $(this).html(localDate.toLocaleString());
    });
});

function setLocale (locale) {
    document.cookie = 'locale=' + locale + '; path=/';
    document.location.reload(true);
}
