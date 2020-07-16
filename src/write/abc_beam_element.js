//    abc_beam_element.js: Definition of the BeamElem class.
//    Copyright (C) 2010-2020 Gregory Dyke (gregdyke at gmail dot com) and Paul Rosen
//
//    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
//    documentation files (the "Software"), to deal in the Software without restriction, including without limitation
//    the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
//    to permit persons to whom the Software is furnished to do so, subject to the following conditions:
//
//    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
//
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
//    BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
//    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
//    DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// Most elements on the page are related to a particular absolute element -- notes, rests, bars, etc. Beams, however, span multiple elements.
// This means that beams can't be laid out until the absolute elements are placed. There is the further complication that the stems for beamed
// notes can't be laid out until the beams are because we don't know how long they will be until we know the slope of the beam and the horizontal
// spacing of the absolute elements.
//
// So, when a beam is detected, a BeamElem is created, then all notes belonging to that beam are added to it. These notes are not given stems at that time.
// Then, after the horizontal layout is complete, all of the BeamElem are iterated to set the beam position, then all of the notes that are beamed are given
// stems. After that, we are ready for the drawing step.

// There are three phases: the setup phase, when new elements are being discovered, the layout phase, when everything is calculated, and the drawing phase,
// when the object is not changed, but is used to put the elements on the page.
var getBarYAt = require('./layout/getBarYAt');
var calcAverage = require('./layout/calcAverage');

var BeamElem;

(function() {
	"use strict";

	//
	// Setup phase
	//
	BeamElem = function BeamElem(stemHeight, type, flat, firstElement) {
		// type is "grace", "up", "down", or undefined. flat is used to force flat beams, as it commonly found in the grace notes of bagpipe music.
		this.isflat = !!flat;
		this.isgrace = (type && type === "grace");
		this.forceup = this.isgrace || (type && type === "up");
		this.forcedown = (type && type === "down");
		this.elems = []; // all the AbsoluteElements that this beam touches. It may include embedded rests.
		this.total = 0;
		this.allrests = true;
		this.stemHeight = stemHeight;
		this.beams = []; // During the layout phase, this will become a list of the beams that need to be drawn.
		if (firstElement && firstElement.duration) {
			this.duration = firstElement.duration;
			if (firstElement.startTriplet) {
				this.duration *= firstElement.tripletMultiplier;
			}
			this.duration = Math.round(this.duration*1000)/1000;
		} else
			this.duration = 0;
	};

	BeamElem.prototype.setHint = function () {
		this.hint = true;
	};

	BeamElem.prototype.add = function(abselem) {
		var pitch = abselem.abcelem.averagepitch;
		if (pitch === undefined) return; // don't include elements like spacers in beams
		if (!abselem.abcelem.rest)
			this.allrests = false;
		abselem.beam = this;
		this.elems.push(abselem);
		this.total = Math.round(this.total+pitch);
		if (this.min === undefined || abselem.abcelem.minpitch < this.min) {
			this.min = abselem.abcelem.minpitch;
		}
		if (this.max === undefined || abselem.abcelem.maxpitch > this.max) {
			this.max = abselem.abcelem.maxpitch;
		}
	};

	var middleLine = 6;	// hardcoded 6 is B

	BeamElem.prototype.calcDir = function() {
		if (this.forceup) return true;
		if (this.forcedown) return false;
		var average = calcAverage(this.total, this.elems.length);
		return average < middleLine;
	};

	BeamElem.prototype.isAbove = function() {
		return this.stemsUp;
	};

	// We can't just use the entire beam for the calculation. The range has to be passed in, because the beam might extend into some unrelated notes. for instance, (3_a'f'e'f'2 when L:16
	BeamElem.prototype.heightAtMidpoint = function(startX, endX) {
		if (this.beams.length === 0)
			return 0;
		var beam = this.beams[0];
		var midPoint = startX + (endX - startX) / 2;
		return getBarYAt(beam.startX, beam.startY, beam.endX, beam.endY, midPoint);
	};

	BeamElem.prototype.yAtNote = function(element) {
		var beam = this.beams[0];
		return getBarYAt(beam.startX, beam.startY, beam.endX, beam.endY, element.x);
	};

	BeamElem.prototype.xAtMidpoint = function(startX, endX) {
		return startX + (endX - startX)/2;
	};

})();

module.exports = BeamElem;
