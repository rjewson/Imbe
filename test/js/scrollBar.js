(function () {

    var $scrollBar, $scrollThumb, isScrolling, scrollBarLength, scrollThumbLength, thumbDelta, scrollThumbPosition, scrollPercent;

    function activateScrollBar() {
        scrollThumbPosition = 0;
        scrollPercent = 0;
        isScrolling = false;
        $scrollBar = $('#scrollBar');
        scrollBarLength = $scrollBar.width();
        $scrollThumb = $('#scrollBar .thumb');
        $scrollThumb.bind('mousedown', startScroll);
    }

    function startScroll(event) {
        isScrolling = true;
        thumbDelta = scrollThumbPosition - event.pageX;
        $(document).bind('mousemove', scrollUpdate);
        $(document).bind('mouseup', endScroll);
        return false;
    }

    function scrollUpdate(event) {

        scrollThumbPosition = event.pageX+thumbDelta;

        scrollPercent = scrollThumbPosition/scrollBarLength;
        scrollPercent = Math.max(0, Math.min(1, scrollPercent));

        scrollThumbPosition = scrollBarLength*scrollPercent;
        $scrollThumb.css('left',scrollThumbPosition);

        if (window.onScrollUpdate)
            window.onScrollUpdate(scrollPercent);

        return false;
    }

    function endScroll(event) {
        isScrolling = false;
        $(document).unbind('mousemove', scrollUpdate);
        $(document).unbind('mouseup', endScroll);
        return false;
    }
    
    activateScrollBar();

})();