/** MIT-LICENSE
Copyright (c) 2008 Mikael Roos, Nodeta Oy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/
/*
 TODO:
  - support for height!=width
*/
FishEye2D = Class.create();
FishEye2D.prototype = {
	// options: dimension, onClick, scaleSize, minimumSize, distanceModel
	initialize: function(area, options) {

		if (!options) options = {};
		this.area = $(area);
		this.areaPosition = this.area.cumulativeOffset();
		this.container = this.area.down();
		this.containerPosition = this.container.cumulativeOffset();
		this.frameLength = this.container.positionedOffset().top;

		/* FOR DEBUGGING *
		for(var i=0;i<5;i++) {
			for(var j=0;j<5;j++) { if(j>=3 && i>=3) continue;
				var div = (new Element('div')).update(new Element('img', {src: 'doc.png'}));
				this.container.appendChild(div);
			}
		}
		/* FOR DEBUGGING */
		
		this.onClick = options['onClick'] || Prototype.emptyFunction;
		this.onMouseOver = options['onMouseOver'] || Prototype.emptyFunction;
		
		var items = this.container.immediateDescendants();
		this.dimension = options['dimension'] || Math.ceil(Math.sqrt(items.size())); 

		this.areaSize = this.area.getHeight();
		this.containerSize = this.container.getHeight(); 
		this.initialSize = this.containerSize/this.dimension; 

		this.scaleSize = options.scaleSize || Math.round(this.initialSize*0.75);
		this.minimumSize = options.minimumSize || Math.round(this.initialSize*0.75);
		
		if (options.distanceModel)
			if (Object.isFunction(options.distanceModel))
				this.distanceModel = options.distanceModel;
			else
				this.distanceModel = this['_'+options.distanceModel+'Model'];
		else
			this.distanceModel = this._realDistanceModel;
		if  (!Object.isFunction(this.distanceModel)) alert('Error! Did not get a proper distance model function');

		this.maximumDistance = Math.round(this.distanceModel(this.areaSize, this.areaSize));

		this.matrix = new Array();
		items.inGroupsOf(this.dimension).each(function(row, i) {
			this.matrix[i] = new Array();
			row.each(function(item, j) { 
				if (!item) return;
				item.setStyle(""+
//DEBUG//
//"background-color: rgb(" + (i*j*20+50) + "," + (j*20+50) + "," + (i*20+50) + ");" +
					'left:' + i*(this.initialSize) + 'px;' +
					'top:' + j*(this.initialSize) + 'px;' +
					'height:' + this.initialSize + 'px;' +
					'width:' + this.initialSize + 'px;'
				);
				this.matrix[i][j] = item;
			}.bind(this));
		}.bind(this));


		this.restoreResetEffects();

		this.observers = {
			'mouseover': [[this.area, this.mouseOver.bindAsEventListener(this)], 
						 [document, this.resetFisheye.bindAsEventListener(this)]],
			'mousemove': [[this.area, this.mouseMove.bindAsEventListener(this)]],
			'click': 	 [[this.container, this.handleClicks.bindAsEventListener(this)]]
		}
		this.registerObservers();
		// elem-event-func
/*		this.area.observe('mousemove', this.mouseMove.bindAsEventListener(this));
		this.area.observe('mouseover', this.mouseOver.bindAsEventListener(this));
		this.container.observe('click', this.handleClicks.bindAsEventListener(this));
		document.observe('mouseover', this.resetFisheye.bindAsEventListener(this));
*/
	},
	applyToObservers: function(func) {
		Object.keys(this.observers).each(function(eventName) {
			this.observers[eventName].each(function(elemFunc) {
				elemFunc[0][func](eventName, elemFunc[1]);
			}.bind(this));
		}.bind(this));
	},
	registerObservers: function() { this.applyToObservers('observe') },
	unRegisterObservers: function() { this.applyToObservers('stopObserving') },
	restoreResetEffects: function(){
		this.resetEffects = new Array();
		this.matrix.each(function(row, i) {
			row.each(function(item, j) {
				if (!item) return;
				this.resetEffects.push(new Effect.Morph(item, {
					style:	'left:' + i*(this.initialSize) + 'px;' +
							'top:' + j*(this.initialSize) + 'px;' +
							'height: ' + this.initialSize + 'px;' + 
							'width: ' + this.initialSize + 'px;',
					duration: 0.5,
					sync: true
				}));
			}.bind(this));
		}.bind(this));

	},
	mouseMove: function(event) { 
		var mouseX = event.pointerX()-this.areaPosition.left;
		var mouseY = event.pointerY()-this.areaPosition.top;
		this.matrix.each(function(row, i) {
			row.each(function(item, j){
				if (!item) return;
				var ray = item.getHeight()/2; // height == width
				var itemPositions = item.positionedOffset();
				
				var centerOffsetY = Math.abs(mouseY-itemPositions.top-ray-this.frameLength);
				var centerOffsetX = Math.abs(mouseX-itemPositions.left-ray-this.frameLength);
				var distance = Math.round(this.distanceModel(centerOffsetX, centerOffsetY));

				var level = this.maximumDistance-distance;

//TODO: parameterize the size function
//				var size = Math.round((level / (this.maximumDistance/this.scaleSize) ) + this.minimumSize);
				var size = Math.round(2000 / ((distance)+11)) + this.minimumSize;
				var positionCorrection = Math.round((this.initialSize-size)/2);

				item.setStyle({
					height: size + 'px', 
					width: size + 'px',
					left: i*this.initialSize + positionCorrection + 'px',
					top: j*this.initialSize + positionCorrection + 'px',
					zIndex: level
				});
			}.bind(this));
		}.bind(this));
	},
	mouseOver: function(event) {
		if (this.onMouseOver) this.onMouseOver(event);
		this.active = true;
		if (this.refreshEffect) 
			this.refreshEffect.cancel();
		event.stop();
	},
	resetFisheye: function(event) {
		if (!this.active) return;
		this.refreshEffect = new Effect.Parallel(this.resetEffects, {duration: 0.5});
		this.active = false;
		this.restoreResetEffects();
	},
	handleClicks: function(event) {
		if (event.element()==this.container) return false;
		this.onClick(event);
	},
	_averageModel: function(x, y) {
		return (x+y)/2;
	},
	_realDistanceModel: function(x, y) {
		return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)); // Pythagoras
	},
	distanceModel: null
}
