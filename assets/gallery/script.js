(function() {
    'use strict';

    let masonryStatus = false;

    function ready(fn) {
        if (document.readyState != 'loading'){
          fn();
        } else {
          document.addEventListener('DOMContentLoaded', fn);
        }
    }

    function getVideoId(url) {
        if ('false' === url) return false;
        var result = /(?:\?v=|\/embed\/|\.be\/)([-a-z0-9_]+)/i.exec(url) || /^([-a-z0-9_]+)$/i.exec(url);

        return result ? result[1] : false;
    }

    function onPlayerReady(event) {
        if (event.target.h.closest('.mbr-slider').classList.contains('in')) {
            event.target.playVideo();
        }
    }

    function isGallery (section) {
        if (!section) return;
        let isDocument = section == document,
            hasGalleryClass = !isDocument && section.matches('.mbr-gallery');
        return hasGalleryClass ? true : false;
    }

    var $,
        isJQuery = typeof jQuery == 'function';
    if (isJQuery) $ = jQuery;
    var isBuilder;
    isJQuery ? isBuilder = $('html').hasClass('is-builder')
    : isBuilder = document.querySelector('html').classList.contains('is-builder');

    /* get youtube id */
    if (!isBuilder) {
        /* google iframe */
        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        var players = [];

        document.querySelectorAll('.carousel-item.video-container > img').forEach(el => el.style.display = 'none');

        /* google iframe api init function */
        window.onYouTubeIframeAPIReady = function() {
            var ytp = ytp || {};
            ytp.YTAPIReady || (ytp.YTAPIReady = !0, document.dispatchEvent(new CustomEvent('YTAPIReady')));
                
            document.querySelectorAll('.video-slide').forEach(function(el, i) {
                var videoDiv = document.createElement('div');
                videoDiv.setAttribute('id', 'mbr-video-'+i);
                videoDiv.setAttribute('data-video-num', i);
                videoDiv.classList.add('mbr-background-video');
                var overlayDiv = document.createElement('div');
                videoDiv.classList.add('item-overlay');
                document.querySelectorAll('.video-container')[i]
                    .appendChild(videoDiv)
                    .appendChild(overlayDiv);
                    el.setAttribute('data-video-num', i);

                if (el.getAttribute('data-video-url').indexOf('vimeo.com') !== -1) {
                    var options = {
                        id: el.getAttribute('data-video-url'),
                        width: '100%',
                        height: '100%',
                        loop: true
                    };

                    var player = new Vimeo.Player('mbr-video-' + i, options);

                    player.playVideo = Vimeo.play;
                } else {
                    var player = new YT.Player('mbr-video-' + i, {
                        height: '100%',
                        width: '100%',
                        videoId: getVideoId(el.getAttribute('data-video-url')),
                        events: {
                            'onReady': onPlayerReady
                        },
                        playerVars: {
                            rel: 0
                        }
                    });
                }

                players.push(player);
            });
        };
    }

    function outerFind(el, selector) {
        var elements = Array.from(el.querySelectorAll(selector));
        if (el.matches && el.matches(selector)) elements.splice(0, 0, el);
        return elements;
    };

    function updateMasonry(event) {
        var section = event ? event.target : document.body;
        if (masonryStatus) return;
        if (typeof Masonry !== 'undefined') {
            masonryStatus = true;
            outerFind(section, '.mbr-gallery').forEach(function (el) {
                var msnr = el.querySelector('.mbr-gallery-row');
                if (!msnr) return;
                var imgLoad = imagesLoaded(msnr)
                imgLoad.on('progress', function (instance, image) {
                    var masonry = new Masonry(msnr, {
                        itemSelector: '.mbr-gallery-item:not(.mbr-gallery-item__hided)',
                        percentPosition: true,
                        horizontalOrder: true
                    });
                    masonry.reloadItems();
                    msnr.addEventListener('filter', function () {
                        masonry.reloadItems();
                        masonry.layout();
                        window.dispatchEvent(new CustomEvent('update.parallax'))
                    }.bind(this, msnr));
                    imagesLoaded(msnr).on('progress', function () {
                        masonry.layout();
                    });
                });
            });
            var elem = document.querySelectorAll('.row.mbr-masonry');
            elem.forEach(item => {
                if (item.querySelectorAll('img').length) {
                    var imgLoad = imagesLoaded(item)
                    imgLoad.on('progress', function (instance, image) {
                        var masonry = new Masonry(item, {});
                        masonry.reloadItems();
                        imagesLoaded(item).on('progress', function () {
                            masonry.layout();
                        });
                    });
                } else {
                    var masonry = new Masonry(item, {});
                    masonry.reloadItems();
                    masonry.layout();
                }

            })

            setTimeout(() => {
                masonryStatus = false
            }, 1500);
        }
    };
    
    if (isJQuery) $(document).on('add.cards', function(event) {
        var $section = $(event.target);
        if (!isGallery(event.target)) return;
        $section.on('click', '.mbr-gallery-filter li', function(e) {
            e.preventDefault();
            var $li = $(this).closest('li');
            $li.parent().find('li').removeClass('active');
            $li.addClass('active');

            var $mas = $li.closest('section').find('.mbr-gallery-row');
            var filter = $(this)[0].textContent.trim();

            $section.find('.mbr-gallery-item').each(function(i, el) {
                var $elem = $(this);
                var tagsAttr = $elem.attr('data-tags');
                var tags = tagsAttr.split(',');

                var tagsTrimmed = tags.map(function(el) {
                    return el.trim();
                });

                if ($.inArray(filter, tagsTrimmed) === -1 && !$li.hasClass('mbr-gallery-filter-all')) {
                    $elem.addClass('mbr-gallery-item__hided');

                    $elem.css('left', '300px');
                } else {
                    $elem.removeClass('mbr-gallery-item__hided');
                    $elem.css('left', '0');
                }
            });

            $mas.closest('.mbr-gallery-row')[0].dispatchEvent(new CustomEvent('filter'));
        });
        // temp fix for gallery modals in builder
        let modal = event.target.querySelector('.modal');
        if (modal)
            modal.addEventListener('show.bs.modal', e => e.preventDefault());
    });

    if (isBuilder) {
        $(document).on('changeButtonColor.cards', function(event) {
            var $section = $(event.target);

            if ($section.find('.mbr-gallery-filter').length > 0 && $(event.target).find('.mbr-gallery-filter').hasClass('gallery-filter-active')) {
                var classAttr = ($section.find('.mbr-gallery-filter .mbr-gallery-filter-all').find('a').attr('class') || '').replace(/(^|\s)active(\s|$)/, ' ').trim();

                $section.find('.mbr-gallery-filter ul li:not(.mbr-gallery-filter-all) a').attr('class', classAttr);
            }

            updateMasonry(event);
        });
    }

    if (isJQuery) $(document).on('add.cards changeParameter.cards', function(event) {
        var $section = $(event.target);
        var filterList = [];

        if (!isGallery(event.target)) return;

        $section.find('.mbr-gallery-item').each(function(el) {
            var tagsList = ($(this).attr('data-tags') || "").trim().split(',');

            tagsList.map(function(el) {
                el = el.trim();
                if ($.inArray(el, filterList) === -1) filterList.push(el);
            });
        });

        if ($section.find('.mbr-gallery-filter').length > 0 && $(event.target).find('.mbr-gallery-filter').hasClass('gallery-filter-active')) {
            var filterHtml = '';

            $section.find('.mbr-gallery-filter ul li:not(.mbr-gallery-filter-all)').remove();

            var allItem = $section.find('.mbr-gallery-filter .mbr-gallery-filter-all'),
                childItem = allItem.clone();
                childItem.find('a').removeClass('active');
 
            filterList.map(function(el) {
                if(childItem.find('a').length) childItem.find('a').text(el);
                else childItem.text(el);
                filterHtml += '<li>' + childItem.html() + '</li>';
            });
            childItem.remove();

            $section.find('.mbr-gallery-filter ul').append(filterHtml);

        }

        updateMasonry(event);
    });

    if (isJQuery) $(document).on('change.cards', function(event) {
        updateMasonry(event);
    });

    if (isJQuery) $(document).on('lazyload', function(event) {
        updateMasonry(event);
        $(window).scrollEnd(function(){
            updateMasonry(event);
        }, 250)
    });

    if(!isBuilder) {
        ready(updateMasonry);
    }
    if(!isBuilder) {
        document.addEventListener('change.cards', function(event) {
            updateMasonry(event);
        })
    }
    if(!isBuilder) {
        document.addEventListener('add.cards', function(event) {
            updateMasonry(event);
        })
    }
    if(!isBuilder) {
        document.addEventListener('changeParameter.cards', function(event) {
            updateMasonry(event);
        })
    }

    document.querySelectorAll('.mbr-gallery-item').forEach(el => el.addEventListener('click', e => e.stopPropagation()));

    var timeout2, timeout, objectLightBox;

    /* Lightbox Fit */

    function styleVideo(carouselItem, wndH, windowPadding, bottomPadding){
        carouselItem.style.top = windowPadding + 'px';
        carouselItem.style.height = wndH - 2 * windowPadding - 2 * bottomPadding + 'px';
    }

    function styleImg(carouselItem, wndH, wndW, windowPadding, bottomPadding){
        var currentImg = carouselItem.querySelector('img');
        if (currentImg.complete && currentImg.naturalWidth > 50 && currentImg.naturalHeight > 50) {
            setCSStoImage(currentImg, carouselItem, wndH, wndW, windowPadding, bottomPadding)
        } else {
            currentImg.addEventListener('load', function() {
                setCSStoImage(currentImg, carouselItem, wndH, wndW, windowPadding, bottomPadding)
            }, {
                once: true
            })
        }
    }

    function setCSStoImage(image, item, wndH, wndW, windowPadding, bottomPadding) {
        var setWidth, setTop;

        var lbW = image.naturalWidth;
        var lbH = image.naturalHeight;

        // height change
        if (wndW / wndH > lbW / lbH) {
            var needH = wndH - bottomPadding * 2;
            setWidth = needH * lbW / lbH;
        } else { // width change
            setWidth = wndW - bottomPadding * 2;
        }
        // check for maw width
        setWidth = setWidth >= lbW ? lbW : setWidth;

        // set top to vertical center
        setTop = (wndH - setWidth * lbH / lbW) / 2;

        image.style.width = parseInt(setWidth) + 'px';
        image.style.height = setWidth * lbH / lbW + 'px';
        item.style.top = setTop + windowPadding + 'px';

        // fix for mobirise5 galleries
        if (getComputedStyle(item.parentElement, null).display == 'flex')
            item.parentElement.style.display = 'block';
    }

    function timeOutCarousel(lightBox, wndW, wndH, windowPadding, bottomPadding, flagResize) {
        var carouselItems = lightBox.querySelector('.modal-dialog').querySelectorAll('.carousel-item');
        carouselItems.forEach(function(el) {
            if ((!flagResize && !el.classList.contains('carousel-item-next') && !el.classList.contains('carousel-item-prev')) || (flagResize && !el.classList.contains('active'))){
                if (el.classList.contains('video-container')) {
                    styleVideo(el, wndH, windowPadding, bottomPadding);
                } else {
                    styleImg(el, wndH, wndW, windowPadding, bottomPadding);
                }
            }
        });
    }

    function fitLightbox() {
        var windowPadding = 0;
        var bottomPadding = 10;
        var wndW = window.innerWidth - windowPadding * 2;
        var wndH = window.innerHeight - windowPadding * 2;

        if (!objectLightBox) {
            return;
        }

        var carouselItemActive, flagResize = false;
        if (objectLightBox.querySelector('.modal-dialog').querySelector('.carousel-item.carousel-item-next')) {
            carouselItemActive = objectLightBox.querySelector('.modal-dialog').querySelector('.carousel-item.carousel-item-next');
        } else {
            carouselItemActive = objectLightBox.querySelector('.modal-dialog').querySelector('.carousel-item.active');
            flagResize = true;
        }

        if (carouselItemActive.classList.contains('video-container')) {
            styleVideo(carouselItemActive, wndH, windowPadding, bottomPadding);
        } else {
            styleImg(carouselItemActive, wndH, wndW, windowPadding, bottomPadding);
        }

        clearTimeout(timeout);

        timeout = setTimeout( timeOutCarousel, 200, objectLightBox, wndW, wndH, windowPadding, bottomPadding, flagResize);

    }

    /* pause/start video on different events and fit lightbox */


    var initFilters = function(context) {
        var section = context,
            allItem = context.querySelector('.mbr-gallery-filter-all'),
            filterList = [];

        if (!section || !isGallery(section)) return;
  
        section.querySelectorAll('.mbr-gallery-item').forEach(function(el) {
          var tagsAttr = (el.getAttribute('data-tags') || '').trim();
          var tagsList = tagsAttr.split(',');
          tagsList.map(function(el) {
            var tag = el.trim();
            if (filterList.indexOf(tag) == -1)
                filterList.push(tag);
            })
          })
  
          if (section.querySelectorAll('.mbr-gallery-filter').length > 0 && section.querySelector('.mbr-gallery-filter').classList.contains('gallery-filter-active')) {
              var filterHtml = [];
              section.querySelectorAll('.mbr-gallery-filter > ul > li').forEach((el, index) => {
                if (index == 0) return;
                el.removeChild(el.firstChild);
              })
              filterList.map(function(tag) {
                var item = document.createElement('li');
                var link = document.createElement('a');
                link.classList.add('btn');
                link.classList.add('btn-md');
                link.classList.add('btn-primary-outline');
                link.classList.add('display-7');
                link.innerText = tag;
                item.appendChild(link);
                filterHtml.push(item);
              });
  
              var ul = section.querySelector('.mbr-gallery-filter > ul');
              ul.appendChild(allItem);
              filterHtml.forEach(li => ul.appendChild(li));
  
              section.querySelectorAll('.mbr-gallery-filter > ul > li').forEach((el) => {
                el.addEventListener('click', function(e) {
                    e.preventDefault();
                    var li = el.closest('li');
        
                    li.parentElement.querySelectorAll('li').forEach(el => el.classList.remove('active'));
                    li.classList.add('active');
        
                    var mas = li.closest('section').querySelector('.mbr-gallery-row');
                    var filter = li.querySelector('a').innerHTML.trim();
        
                    section.querySelectorAll('.mbr-gallery-item').forEach(function(el) {
                        var tagsAttr = el.getAttribute('data-tags');
                        var tags = tagsAttr.split(',');
        
                        var tagsTrimmed = tags.map(el => el.trim());
        
                        if (tagsTrimmed.indexOf(filter) == -1 && !li.classList.contains('mbr-gallery-filter-all')) {
                            el.classList.add('mbr-gallery-item__hided');
                            el.style.left = '300px';
                        } else {
                            el.style.left = '0';
                            el.classList.remove('mbr-gallery-item__hided');
                        }
                    });
        
                    mas.closest('.mbr-gallery-row').dispatchEvent(new CustomEvent('filter'));
                });
            })
          } else {
              section.querySelector('.mbr-gallery-item__hided').classList.remove('mbr-gallery-item__hided');
              section.querySelector('.mbr-gallery-row').dispatchEvent(new CustomEvent('filter'));
          }
    }

    var galleries = document.querySelectorAll('.mbr-gallery');

    if (galleries.length) {

        galleries.forEach(gallery => {
            // initialize tags
            if (gallery.querySelector('.mbr-gallery-filter')) initFilters(gallery);

            gallery.addEventListener('show.bs.modal', function(e) {
                clearTimeout(timeout2);

                timeout2 = setTimeout(function() {
                    var index = e.relatedTarget.parentElement.getAttribute('data-video-num');
                    var slide = e.target.querySelector('.carousel-item').querySelector(`.mbr-background-video[data-video-num="${index}"]`);
                    if (slide && slide.closest('.carousel-item').classList.contains('active')) {
                        var player = players[+slide.getAttribute('data-video-num')];
                        player.playVideo ? player.playVideo() : player.play();
                    }
                }, 500);

                objectLightBox = e.target;

                fitLightbox();

            });

            gallery.addEventListener('slide.bs.carousel', function(e) {
                var ytv = e.target.querySelector('.carousel-item.active > .mbr-background-video');
                if (ytv) {
                    var player = players[+ytv.getAttribute('data-video-num')];
                    player.pauseVideo ? player.pauseVideo() : player.pause();
                }
            });

            // gallery.addEventListener('slid.bs.carousel', function(e) {
            //     var ytv = e.target.querySelector('.carousel-item.active').querySelector('.mbr-background-video');

            //     if (ytv) {
            //         var player = players[+ytv.getAttribute('data-video-num')];
            //         player.playVideo ? player.playVideo() : player.play();
            //     }
                
            // });

            gallery.addEventListener('hide.bs.modal', function(e) {
                players.map(function(player) {
                    player.pauseVideo ? player.pauseVideo() : player.pause();
                });

                objectLightBox = null;
            });
        })
    }
    window.addEventListener('resize', fitLightbox);
    window.addEventListener('load', fitLightbox);
}());
//# sourceMappingURL=script.js.map
