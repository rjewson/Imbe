!function ($) {
    
    var Imbe = window.Imbe = {};

    var commonVars = {
        initalized : false,
        active : true,
        startTime : 0,
        progress : 0,
        running : false,
        offset : 0,
        delay : 0,
        timelineOffset : -1,
        processParams : function() {
            this.callOnInit = (this.params.onInit && typeof this.params.onInit === 'function');
            this.callOnStart = (this.params.onStart && typeof this.params.onStart === 'function');
            this.callOnProgress = (this.params.onProgress && typeof this.params.onProgress === 'function');
            this.callOnEnd = (this.params.onEnd && typeof this.params.onEnd === 'function');
            if (!this.params.ease) 
                this.params.ease = Imbe.easing.Linear.None;
            this.delay = this.params.delay||0;
        }
    };

    Imbe.tween = function(params) {
        this.params = params;
        $.extend(this,commonVars);
        this.processParams();
    };

    Imbe.tween.prototype = {

        constructor : Imbe.tween,
        
        init : function() {

            this.duration = this.params.duration;

            if (this.params.selector)
                this.element = $(this.params.selector);
            this.tweenedProps = {};

            //If were chaining, setup up the flag and reset the startProps to an object
            // this.chainProps = false;
            // if (typeof this.params.startProps === 'string' && this.params.startProps === 'chain') {
            //     this.chainProps = true;
            //     this.params.startProps = {};
            // }

            this.hasComplexTypes = false;
            
            for (var prop in this.params.startProps) {
                //Create cached set for setting the CSS
                this.tweenedProps[prop] = this.params.startProps[prop];
                //Copy missing props to the end if missing
                if ( this.params.endProps[prop] == undefined) {
                    this.params.endProps[prop] = this.params.startProps[prop];
                }
            }

            if (this.callOnInit) 
                this.params.onInit.call(this);
        },
        
        render : function(playHead) {
            this.progress = (playHead - this.startTime) / (this.duration);

            if (!this.running&&this.callOnStart)
                this.params.onStart.call(this);
            
            this.running = true;

            //Tween is outside its boundaries, clamp to 0-1 and shut it down
            if (this.progress<0) {
                this.progress=0;
                this.running = false;
            }
            if (this.progress>1) {
                this.progress=1;
                this.running = false;
            }
            
            //Tween all the properties
            for (var prop in this.tweenedProps) {

                if (this.hasComplexTypes&&Imbe.tweenableTypes.complexCSS[prop]) {
                
                    this.tweenedProps[prop] = Imbe.tweenableTypes.complexCSS[prop].call(this,this.params.startProps[prop], this.params.endProps[prop], this.progress, 1, this.params.ease );

                } else {
                
                    this.tweenedProps[prop] = Imbe.tweenableTypes.numeric.call(this,this.params.startProps[prop], this.params.endProps[prop], this.progress, 1, this.params.ease );
                
                }

            }
            //Apply the CSS
            if (this.element)
                this.element.css(this.tweenedProps);
            
            if (this.callOnProgress) 
                this.params.onProgress.call(this);

            if (this.running==false&&this.callOnEnd)
                this.params.onEnd.call(this);

        }

        // getTweenedValue : function(start, end, currentTime, totalTime, easing) {
        //     var delta = end - start;
        //     var percentComplete = currentTime/totalTime;
        //     return easing(percentComplete) * delta + start;
        // }
    };

    Imbe.timeline = function(params) {
        this.params = params||{};
        this.children = [];
        this.labels = {};
        $.extend(this,commonVars);
        this.processParams();
    };

    Imbe.timeline.prototype = {

        constructor : Imbe.timeline,
        
        init : function() {
            var nextStartTime = this.startTime + this.delay;
            var count = this.children.length;

            for ( var i = 0; i <count; i++ ) {
                var tweenable = this.children[i];
                
                if (tweenable.timelineOffset<0) {
                    tweenable.startTime = nextStartTime + tweenable.delay;
                } else {
                    tweenable.startTime = this.startTime + this.delay + tweenable.timelineOffset + tweenable.delay;
                }

                tweenable.init();
                
                if (tweenable.timelineOffset<0) {
                    nextStartTime += tweenable.duration + tweenable.delay; 
                    if (nextStartTime>tweenable.duration+this.startTime)
                        this.duration = nextStartTime-this.startTime;
                } else {
                    if (tweenable.startTime+tweenable.duration > this.duration)
                        this.duration = tweenable.startTime+tweenable.duration;
                }
            }
        },

        insert : function(tween,time) {
            //tween.timelineOffset = time||-1;
            tween.timelineOffset = (time === undefined) ? -1 : time;
            this.children.push(tween);
        },
        
        render : function(playHead) {
            this.progress = (playHead - this.startTime) / (this.duration);
            
            if (!this.running&&this.callOnStart)
                this.params.onStart.call(this);
            
            this.running = true;

            //Tween is outside its boundaries, clamp to 0-1 and shut it down
            if (this.progress<0) {
                this.progress=0;
                this.running = false;
            }
            if (this.progress>1) {
                this.progress=1;
                this.running = false;
            }

            var count = this.children.length;
            
            for ( var i = 0; i <count; i++ ) {

                var tweenable = this.children[i];

                if (playHead>=tweenable.startTime && playHead<=tweenable.startTime+tweenable.duration) {    //Tween in range
                    tweenable.render(playHead);
                } else if (playHead<tweenable.startTime && tweenable.progress>0){                           //Tween out of range but not complete
                    tweenable.render(playHead);
                } else if (playHead>tweenable.startTime+tweenable.duration && tweenable.progress<1){        //Tween out of range but not complete
                    tweenable.render(playHead);
                }

            }

            if (this.callOnProgress) 
                this.params.onProgress.call(this);

            if (this.running==false&&this.callOnEnd)
                this.params.onEnd.call(this);
        },

        addLabel : function (label,time) {
            labels[label] = time;
        },

        removeLabel : function (label) {
            var n = labels[label];
            delete labels[label];
            return n;
        }
        
    };

    Imbe.tweenableTypes = {

        "numeric" : function(start, end, currentTime, totalTime, easing) {
            var delta = end - start;
            var percentComplete = currentTime/totalTime;
            return easing(percentComplete) * delta + start;
        },

        complexCSS : {
            "background-position" : function(start, end, currentTime, totalTime, easing) {
               return Imbe.propertyTypes.numeric(start, end, currentTime, totalTime, easing);
            }
        },
        
    };

    var _commonTimeline = function() {
        this.children = [];
        this.interval = null;
        this.timingResolution = 1000/30;
    }

    _commonTimeline.prototype = {

        constructor : Imbe.commonTimeline,

        run : function(tween) {
            this.children.push(tween);
            tween.startTime = Date.now() + tween.delay;
            tween.init();
        },

        update : function() {
            this.render(Date.now());
        },

        start : function() {
            if (!this.interval) {
                var context = this;
                var method = this.update;
                this.interval = setInterval(function(){
                    method.call(context);
                },this.timingResolution);
                
            }
        },

        stop : function() {
            clearInterval(this.interval);
            this.interval = null;
        },

        render : function(playHead) {
            
            var count = this.children.length;
            //console.log(playHead);
            for ( var i = 0; i <count; i++ ) {

                var tweenable = this.children[i];

                if (playHead>=tweenable.startTime && playHead<=tweenable.startTime+tweenable.duration) {    //Tween in range
                    tweenable.render(playHead);
                    console.log('1');
                } else if (playHead>tweenable.startTime+tweenable.duration) {        //Tween out of range but not complete
                    tweenable.render(playHead);
                    this.children.splice(i,1);
                    count--;
                    console.log('2');
                }

            }
        }

    }

    Imbe.commonTimeline = new _commonTimeline();

    // Robert Penners easing via Tween.js
    Imbe.easing = {

        Linear: {
            None: function ( k ) {
                return k;
            }
        },

        Quadratic: {
            In: function ( k ) {
                return k * k;
            },
            Out: function ( k ) {
                return k * ( 2 - k );
            },
            InOut: function ( k ) {
                if ( ( k *= 2 ) < 1 ) return 0.5 * k * k;
                return - 0.5 * ( --k * ( k - 2 ) - 1 );
            }
        },

        Cubic: {
            In: function ( k ) {
                return k * k * k;
            },
            Out: function ( k ) {
                return --k * k * k + 1;
            },
            InOut: function ( k ) {
                if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k;
                return 0.5 * ( ( k -= 2 ) * k * k + 2 );
            }
        },

        Quartic: {
            In: function ( k ) {
                return k * k * k * k;
            },
            Out: function ( k ) {
                return 1 - --k * k * k * k;
            },
            InOut: function ( k ) {
                if ( ( k *= 2 ) < 1) return 0.5 * k * k * k * k;
                return - 0.5 * ( ( k -= 2 ) * k * k * k - 2 );
            }
        },

        Quintic: {
            In: function ( k ) {
                return k * k * k * k * k;
            },
            Out: function ( k ) {
                return --k * k * k * k * k + 1;
            },
            InOut: function ( k ) {

                if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k * k * k;
                return 0.5 * ( ( k -= 2 ) * k * k * k * k + 2 );
            }
        },

        Sinusoidal: {
            In: function ( k ) {
                return 1 - Math.cos( k * Math.PI / 2 );
            },
            Out: function ( k ) {
                return Math.sin( k * Math.PI / 2 );
            },
            InOut: function ( k ) {
                return 0.5 * ( 1 - Math.cos( Math.PI * k ) );
            }
        },

        Exponential: {
            In: function ( k ) {
                return k === 0 ? 0 : Math.pow( 1024, k - 1 );
            },
            Out: function ( k ) {
                return k === 1 ? 1 : 1 - Math.pow( 2, - 10 * k );
            },
            InOut: function ( k ) {
                if ( k === 0 ) return 0;
                if ( k === 1 ) return 1;
                if ( ( k *= 2 ) < 1 ) return 0.5 * Math.pow( 1024, k - 1 );
                return 0.5 * ( - Math.pow( 2, - 10 * ( k - 1 ) ) + 2 );
            }
        },

        Circular: {
            In: function ( k ) {
                return 1 - Math.sqrt( 1 - k * k );
            },
            Out: function ( k ) {
                return Math.sqrt( 1 - --k * k );
            },
            InOut: function ( k ) {
                if ( ( k *= 2 ) < 1) return - 0.5 * ( Math.sqrt( 1 - k * k) - 1);
                return 0.5 * ( Math.sqrt( 1 - ( k -= 2) * k) + 1);
            }
        },

        Elastic: {
            In: function ( k ) {

                var s, a = 0.1, p = 0.4;
                if ( k === 0 ) return 0;
                if ( k === 1 ) return 1;
                if ( !a || a < 1 ) { a = 1; s = p / 4; }
                else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
                return - ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );
            },
            Out: function ( k ) {
                var s, a = 0.1, p = 0.4;
                if ( k === 0 ) return 0;
                if ( k === 1 ) return 1;
                if ( !a || a < 1 ) { a = 1; s = p / 4; }
                else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
                return ( a * Math.pow( 2, - 10 * k) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) + 1 );
            },
            InOut: function ( k ) {
                var s, a = 0.1, p = 0.4;
                if ( k === 0 ) return 0;
                if ( k === 1 ) return 1;
                if ( !a || a < 1 ) { a = 1; s = p / 4; }
                else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
                if ( ( k *= 2 ) < 1 ) return - 0.5 * ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );
                return a * Math.pow( 2, -10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) * 0.5 + 1;
            }
        },

        Back: {
            In: function ( k ) {
                var s = 1.70158;
                return k * k * ( ( s + 1 ) * k - s );
            },
            Out: function ( k ) {
                var s = 1.70158;
                return --k * k * ( ( s + 1 ) * k + s ) + 1;
            },
            InOut: function ( k ) {
                var s = 1.70158 * 1.525;
                if ( ( k *= 2 ) < 1 ) return 0.5 * ( k * k * ( ( s + 1 ) * k - s ) );
                return 0.5 * ( ( k -= 2 ) * k * ( ( s + 1 ) * k + s ) + 2 );
            }
        },

        Bounce: {
            In: function ( k ) {
                return 1 - TWEEN.Easing.Bounce.Out( 1 - k );
            },
            Out: function ( k ) {
                if ( k < ( 1 / 2.75 ) ) {
                    return 7.5625 * k * k;
                } else if ( k < ( 2 / 2.75 ) ) {
                    return 7.5625 * ( k -= ( 1.5 / 2.75 ) ) * k + 0.75;
                } else if ( k < ( 2.5 / 2.75 ) ) {
                    return 7.5625 * ( k -= ( 2.25 / 2.75 ) ) * k + 0.9375;
                } else {
                    return 7.5625 * ( k -= ( 2.625 / 2.75 ) ) * k + 0.984375;
                }
            },
            InOut: function ( k ) {
                if ( k < 0.5 ) return TWEEN.Easing.Bounce.In( k * 2 ) * 0.5;
                return TWEEN.Easing.Bounce.Out( k * 2 - 1 ) * 0.5 + 0.5;
            }
        }

    };

    Imbe.interpolation = {
        Linear: function ( v, k ) {
            var m = v.length - 1, f = m * k, i = Math.floor( f ), fn = TWEEN.Interpolation.Utils.Linear;

            if ( k < 0 ) return fn( v[ 0 ], v[ 1 ], f );
            if ( k > 1 ) return fn( v[ m ], v[ m - 1 ], m - f );

            return fn( v[ i ], v[ i + 1 > m ? m : i + 1 ], f - i );
        },
        Bezier: function ( v, k ) {
            var b = 0, n = v.length - 1, pw = Math.pow, bn = TWEEN.Interpolation.Utils.Bernstein, i;

            for ( i = 0; i <= n; i++ ) {
                b += pw( 1 - k, n - i ) * pw( k, i ) * v[ i ] * bn( n, i );
            }

            return b;
        },

        CatmullRom: function ( v, k ) {
            var m = v.length - 1, f = m * k, i = Math.floor( f ), fn = TWEEN.Interpolation.Utils.CatmullRom;
            if ( v[ 0 ] === v[ m ] ) {

                if ( k < 0 ) i = Math.floor( f = m * ( 1 + k ) );

                return fn( v[ ( i - 1 + m ) % m ], v[ i ], v[ ( i + 1 ) % m ], v[ ( i + 2 ) % m ], f - i );

            } else {

                if ( k < 0 ) return v[ 0 ] - ( fn( v[ 0 ], v[ 0 ], v[ 1 ], v[ 1 ], -f ) - v[ 0 ] );
                if ( k > 1 ) return v[ m ] - ( fn( v[ m ], v[ m ], v[ m - 1 ], v[ m - 1 ], f - m ) - v[ m ] );

                return fn( v[ i ? i - 1 : 0 ], v[ i ], v[ m < i + 1 ? m : i + 1 ], v[ m < i + 2 ? m : i + 2 ], f - i );

            }
        },

        Utils: {
            Linear: function ( p0, p1, t ) {
                return ( p1 - p0 ) * t + p0;
            },
            Bernstein: function ( n , i ) {
                var fc = TWEEN.Interpolation.Utils.Factorial;
                return fc( n ) / fc( i ) / fc( n - i );
            },
            Factorial: ( function () {

                var a = [ 1 ];

                return function ( n ) {

                    var s = 1, i;
                    if ( a[ n ] ) return a[ n ];
                    for ( i = n; i > 1; i-- ) s *= i;
                    return a[ n ] = s;

                }
            } )(),
            CatmullRom: function ( p0, p1, p2, p3, t ) {
                var v0 = ( p2 - p0 ) * 0.5, v1 = ( p3 - p1 ) * 0.5, t2 = t * t, t3 = t * t2;
                return ( 2 * p1 - 2 * p2 + v0 + v1 ) * t3 + ( - 3 * p1 + 3 * p2 - 2 * v0 - v1 ) * t2 + v0 * t + p1;
            }
        }
    };

}(window.jQuery);