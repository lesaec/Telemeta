/*
 * Copyright (C) 2007-2011 Parisson
 * Copyright (c) 2011 Riccardo Zaccarelli <riccardo.zaccarelli@gmail.com>
 * Copyright (c) 2010 Olivier Guilyardi <olivier@samalyse.com>
 *
 * This file is part of TimeSide.
 *
 * TimeSide is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * TimeSide is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with TimeSide.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Authors: Riccardo Zaccarelli <riccardo.zaccarelli@gmail.com>
 *          Olivier Guilyardi <olivier@samalyse.com>
 */

/**
 * Class representing the ruler (upper part) of the player. Requires jQuery
 * and Raphael
 */
Timeside.classes.Ruler = Timeside.classes.TimesideArray.extend({
    //init constructor: soundDuration is IN SECONDS!!! (float)
    init: function(rulerContainer, waveContainer, soundDuration){
        this._super();
        //var cssPref = this.cssPrefix;

        this.getSoundDuration= function(){
            return soundDuration;
        };

        //var waveContainer = viewer.find('.' + cssPref + 'image-canvas');
        this.debug( 'WAVECONTAINER?? LENGTH='+ waveContainer.length);
        this.getWaveContainer =function(){
            return waveContainer;
        };
        //TODO: we dont need containerWiever here!!!
        //better: it is usefult only for the canvas defined below. However...
        this.getContainerWidth =function(){
            return waveContainer.width();
        };
        this.debug( 'init ruler: container width '+this.getContainerWidth());

        //private function used in resize() defined below
        //var container = viewer.find('.' + cssPref + 'ruler');

        this.getRulerContainer = function(){
            return rulerContainer;
        }
    },
//    init: function(viewer, soundDuration){
//        this._super();
//        var cssPref = this.cssPrefix;
//
//        this.getSoundDuration= function(){
//            return soundDuration;
//        };
//
//        var waveContainer = viewer.find('.' + cssPref + 'image-canvas');
//        this.debug( 'WAVECONTAINER?? LENGTH='+ waveContainer.length);
//        this.getWaveContainer =function(){
//            return waveContainer;
//        };
//        //TODO: we dont need containerWiever here!!!
//        //better: it is usefult only for the canvas defined below. However...
//        this.getContainerWidth =function(){
//            return waveContainer.width();
//        };
//        this.debug( 'init ruler: container width '+this.getContainerWidth());
//
//        //private function used in resize() defined below
//        var container = viewer.find('.' + cssPref + 'ruler');
//
//        this.getRulerContainer = function(){
//            return container;
//        }
//    },

    //colors:{}, //used to draw rulermarkers
    
    resize : function(){
        var duration = this.getSoundDuration(); //in seconds
        if (!duration) {
            this.debug("Can't draw ruler with a duration of 0");
            return;
        }

        var $J = this.$J;
        var rulerContainer = this.getRulerContainer();
       
        //remove all elements not pointer or marker
        rulerContainer.find(':not(a.ts-pointer,a.ts-marker,a.ts-pointer>*,a.ts-marker>*)').remove();

        //calculate h with an artifice: create a span (that will be reused later) with the "standard" label
        var firstSpan = $J('<span/>').css({
            'display':'block',
            'position':'absolute'
        }).html('00000'); //typical timelabel should be '00:00', with '00000' we assure a bit of extra safety space
        //note also that display and position must be set as below to calculate the proper outerHeight
        rulerContainer.append(firstSpan); //to calculate height, element must be in the document, append it
        var verticalMargin = 1;
        var h = 2*(verticalMargin+firstSpan.outerHeight());
        //h is the default height of the ruler svg (according to ruler font size)
        //to accomodate the necessary space for the labels
        //however, if we set a custom height on the ruler, ie h2 is nonzero:
        var h2 = rulerContainer.height(); 
        //then, set the custom height as height for the canvas:
        //note that, as markers and pointer have position: absolute, they do not affect div height
        if(h2){
            h = h2;
        }
        //TODO: set height in div ruler????
        //rulerContainer.css('height',h+'px');
        var obj = this.calculateRulerElements(rulerContainer.width(),h,firstSpan.outerWidth());
        this.drawRuler(rulerContainer,h,obj.path);
        
        var labels = obj.labels;
        if(labels && labels.length){
            for(var i=0; i <labels.length;i++){
                var span = (i==0 ? firstSpan : $J('<span/>'));
                span.html(labels[i][0]).css({
                    'display':'block',
                    'position':'absolute',
                    'width':'',
                    'height':'',
                    'right':'',
                    'bottom':'',
                    'top':'0',
                    'left':labels[i][1]+'px'
                });
                rulerContainer.append(span);
            }
        }else{
            firstSpan.html(this.makeTimeLabel(0));
        }

        var pointer = undefined;
        if('getPointer' in this){
            pointer = this.getPointer();
        }
        if(!pointer){
            pointer = this.add(0,-1);
            this.getPointer = function(){
                return pointer;
            };
        }else{
            pointer.refreshPosition();
            
        }
        this.each(function(i,rulermarker){
            rulermarker.refreshPosition();
        });
        

    },

    drawRuler: function(rulerContainer,h,rulerLinesPath){
        var cssPref = this.cssPrefix;
        var upperRectClass = cssPref + 'svg-' + 'ruler-upper-rect';
        var rulerLinesClass = cssPref + 'svg-' + 'ruler-lines';

        if(!this.isSvgSupported){
            var paper = Raphael(rulerContainer[0], rulerContainer.width(), h);
            var rect = paper.rect(0,0, rulerContainer.width(), h/2);
            var path = paper.path(rulerLinesPath);
            var attr = this.getVmlAttr;
            rect.attr(attr(upperRectClass));
            path.attr(attr(rulerLinesClass));
            return;
        }
        //create svg. Note that elements must be created within a namespace (createElementNS)
        //and attributes must be set via .setAttributeNS(null,name,value)
        //in other words, jQuery does not work (maybe in future releases)
        var $J = this.$J;
        var svgNS = "http://www.w3.org/2000/svg";
        var d = document;
        var svg  = d.createElementNS(svgNS, "svg:svg");
        svg.setAttributeNS( null, "width", rulerContainer.width()); //TODO: optimize width is called also below
        svg.setAttributeNS( null, "height", h);
        rulerContainer.append($J(svg));

        var rect = d.createElementNS(svgNS, "svg:rect");
        rect.setAttributeNS( null, "x", 0);
        rect.setAttributeNS( null, "y", 0);
        rect.setAttributeNS( null, "width", rulerContainer.width());
        rect.setAttributeNS( null, "height", (h/2));
        rect.setAttributeNS( null, "class", upperRectClass);
        svg.appendChild(rect);
        var lines = d.createElementNS(svgNS, "svg:path");
        lines.setAttributeNS( null, "d", rulerLinesPath);
        lines.setAttributeNS( null, "class", rulerLinesClass);
        svg.appendChild(lines);
    },
    /**
     * returns an object with the following properties:
     * path: (string) the path of the ruler to be drawn
     * labels (array) an array of arrays ['text',x,y]
     */
    calculateRulerElements: function(w,h,timeLabelWidth){
        
        var duration = this.getSoundDuration();
        
        var fontLeftMargin = 2; //should be eual or greater to the ruler stroke width, so that
        //the labels are not overlapping the vertical ruler lines
        timeLabelWidth+=fontLeftMargin;

        var timeLabelDuration = timeLabelWidth*duration/w;
        
        //determine the ticks:
        var sectionDurations = [1,2,5,10,30,60,120,300,1800,3600,7200,18000,36000];
        //sectionDurations in seconds. Note that 60=1 minute, 3600=1 hour (so the maximum sectionDuration is 36000=10hours)
        var i=0;
        var len = sectionDurations.length;
        while(i<len && timeLabelDuration>sectionDurations[i]){
            i++;
        }
        var sectionDuration = sectionDurations[i];
        var sectionNums = parseInt(0.5+(duration/sectionDurations[i])); //ceil
        var sectionWidth = w*sectionDuration/duration;


        var tickCounts = [10,5,2,1];
        i=0;
        var tickCount = tickCounts[0];
        while(i<tickCounts.length-1 && tickCounts[i]*2>sectionWidth){
            i++;
        }
        var tickAtHalfSectionWidthHigher = i==0 || i==2; //draw tick at half section higher if ticks are even
        tickCount = tickCounts[i];
        var tickWidth = sectionWidth/tickCount;
        var makeTimeLabel = this.makeTimeLabel;
        var h_1 = h-1; //TODO: use line tickness instead of 1
        var path = new Array(parseInt(0.5+(w/tickWidth)));
        path[0] = ['M 0 '+h_1];
        len = path.length;
        for(i=0;  i < len; i+=tickCount){
            for(var j=1; j<tickCount+1; j++){
                var k = i+j;
                var x = (k*tickWidth);
                var y = (j==tickCount ? 0 : tickAtHalfSectionWidthHigher && j==(tickCount)/2 ? .5*h : .75*h);
                var baseline = ' L '+x+' '+h_1;
                path[k] = baseline;
                path[k] += ' L '+x+' '+y;
                path[k] += baseline;
            }
        }
        var labels = new Array(sectionNums);
        for(i=0; i<sectionNums; i++){
            labels[i] = [makeTimeLabel(sectionDuration*i),fontLeftMargin+i*sectionWidth];
        }
        return {
            'path': path.join(''),
            'labels':labels
        };
    },

    //overridden: Note that the pointer is NOT cleared!!!!!
    clear: function(){
        var markers = this._super();
        //now remove also the labels in the player ruler:
        for( var i=0; i<markers.length; i++){
            markers[i].remove();
        }
        return markers;
    },
    
    //overridden 
    remove: function(index){
        var rulermarker = this._super(index);
        rulermarker.remove();
        this.each(index, function(i,rulermarker){
            rulermarker.setIndex(i, true);
        });
    },

    //overridden: do not call directly this method, use markermap.move
    move: function(from, to, newOffset){
        var newIndex = this._super(from,to);
        //update label if it is the case:
        var rulermarker = this.toArray()[newIndex];
        var pixelOffset = this.toPixelOffset(newOffset);
        if(rulermarker.positionInPixels != pixelOffset){ //should not be the case if this method is called from a mouse event
            rulermarker.move(pixelOffset);
//            consolelog('moved');
//        }else{
//            consolelog('nothing to move');
        }

        //this.debug('ruler.move: [from:'+from+', to:'+to+', real:'+newIndex+']');
        if(newIndex!=from){
            var i1 = Math.min(from,newIndex);
            var i2 = Math.max(from,newIndex)+1;
            //this.debug('updating ['+i1+','+i2+']');
            this.each(i1,i2, function(index,rulermarker){
                rulermarker.setIndex(index, true);
            });
        }
    },
    //overridden
    //add(offset.-1) adds the pointer, isMovable is ingored
    //add(offset, index, isMovable) adds a marker, movable if isMovable == true
    add: function(offset, index, isMovable){
        var soundPosition;
        var isMovable;
        var markerClass;

        if(index<0){
            soundPosition = offset;
            isMovable = true;
            markerClass='pointer';
        }else{
            soundPosition = offset;
            //isMovable = offset.isEditable;
            markerClass='marker';
        }
        
        var container = this.getRulerContainer();
        var layout = container.find("."+this.cssPrefix + 'layout');
        var $J = this.$J;
        //        var pointer = new RulerMarker($J(layout.get(0)),this.getWaveContainer(),markerClass);

        
        var pointerOrMarker = new Timeside.classes.RulerMarker(this,this.getWaveContainer(),markerClass);

        

        //call super constructor
        //if it is a pointer, dont add it
        if(markerClass != 'pointer'){
            this._super(pointerOrMarker,index); //add at the end
            //note that setText is called BEFORE move as move must have the proper label width
            this.each(index, function(i,rulermarker){
                rulermarker.setIndex(i,i!=index);
            //rulermarker.setIndex.apply(rulermarker, [i,i!=indexIfMarker]); //update label width only if it is not this marker added
            //as for this marker we update the position below (move)
            });
            this.debug('added marker at index '+index+' offset: '+offset);
        }else{
            //note that setText is called BEFORE move as move must have the proper label width
            pointerOrMarker.setText(this.makeTimeLabel(0));
        }
        //proceed with events and other stuff: move (called AFTER setText or setText)
        pointerOrMarker.move(this.toPixelOffset(soundPosition));
       
        //pointer.setText(markerClass== 'pointer' ? this.makeTimeLabel(0) : this.length);

        //click on labels stop propagating. Always:
        var lbl = pointerOrMarker.getLabel();
        lbl.bind('click', function(evt){
            evt.stopPropagation();
            return false;
        });

        //if there are no events to associate, return it.
        if(!isMovable){
            return pointerOrMarker;
        }

        //namespace for jquery event:
        var eventId = 'markerclicked';
        var doc = $J(document);
        
        var me = this;

        //flag to be set to true when moving a poiner from mouse.
        //when true, movePointer (see below) has no effect
        this.isPointerMovingFromMouse = false;
        //functions to set if we are moving the pointer (for player when playing)

        lbl.bind('mousedown.'+eventId,function(evt) {
            
            if(markerClass=='pointer'){
                me.isPointerMovingFromMouse = true;
            }

            var startX = evt.pageX; //lbl.position().left-container.position().left;
            var startPos = lbl.position().left+lbl.width()/2;
            
            evt.stopPropagation(); //dont notify the ruler or other elements;
            var newPos = startPos;
            doc.bind('mousemove.'+eventId, function(evt){
                var x = evt.pageX;
                newPos = startPos+(x-startX);
                pointerOrMarker.move(newPos);
                //update the text if pointer
                if(markerClass=='pointer'){
                    pointerOrMarker.setText(me.makeTimeLabel(me.toSoundPosition(newPos)));
                }
                return false;
                
            });
            //to avoid scrolling
            ////TODO: check IE bug on mouseup on the ruler (pointer is moving too)
            //TODO: what happens if the user releases the mouse OUTSIDE the browser???? check bug in IE (mouse release)
            var mouseup = function(evt_){
                doc.unbind('mousemove.'+eventId);
                doc.unbind('mouseup.'+eventId);
                evt_.stopPropagation();
                if(newPos == startPos){
                    return false;
                }
                var data = {
                    'markerElement':pointerOrMarker,
                    'soundPosition': me.toSoundPosition.apply(me,[newPos]),
                    'markerClass':markerClass
                };
                me.fire('markermoved',data);
                if(markerClass=='pointer'){
                    me.isPointerMovingFromMouse = false;
                }
                return false;
            };
            doc.bind('mouseup.'+eventId, mouseup);
            
            return false;
        });
        
        return pointerOrMarker;


    },

    //moves the pointer, does not notify any listener.
    //soundPosition is in seconds (float)
    movePointer : function(soundPosition) {
        var pointer = this.getPointer();
        if (pointer && !this.isPointerMovingFromMouse) {
            var pixelOffset = this.toPixelOffset(soundPosition);
            //first set text, so the label width is set, then call move:
            pointer.setText(this.makeTimeLabel(soundPosition));
            pointer.move(pixelOffset); //does NOT fire any move method
        }
        //this.debug('moving pointer: position set to '+offset);
        return soundPosition;
    },

    //soundPosition is in seconds (float)
    toPixelOffset: function(soundPosition) {
        //this.debug('sPos:' + soundPosition+ 'sDur: '+this.getSoundDuration());
        var duration = this.getSoundDuration();
        if (soundPosition < 0){
            soundPosition = 0;
        }else if (soundPosition > duration){
            soundPosition = duration;
        }
        var width = this.getContainerWidth();
        var pixelOffset = (soundPosition / duration) * width;
        return pixelOffset;
    },

    //returns the soundPosition is in seconds (float)
    toSoundPosition: function(pixelOffset) {
        var width = this.getContainerWidth();

        if (pixelOffset < 0){
            pixelOffset = 0;
        }else if (pixelOffset > width){
            pixelOffset = width;
        }
        var duration = this.getSoundDuration();
        var soundPosition = (pixelOffset / width) *duration;
        return soundPosition;
    }
});
