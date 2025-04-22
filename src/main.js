import gsap, { TweenLite } from 'gsap';
import Draggable from 'gsap/Draggable';

gsap.registerPlugin(TweenLite, Draggable)

var context = new (window.AudioContext || window.webkitAudioContext);

var startBtn = document.getElementById("start-btn");
startBtn.addEventListener("click", function() {
	context.resume()
})

function Plugin(el) {
	this.el = el;

	var plugin = this.el;
	var label = document.getElementById(plugin.dataset.label);
	var min = -150;
	var max = 150;
	var res = 0.85;
	var instance = null;

	var _add_events = function () {
		TweenLite.set(plugin, { rotation: _calc_rotation() });
		Draggable.create(plugin, {
			type: 'rotation',
			throwProps: false,
			edgeResistance: res,
			onDrag: _calc_value,
			bounds: {
				minRotation: min,
				maxRotation: max
			}
		});
		instance = Draggable.get(plugin)
	}


	var _calc_value = function () {
		var minValue = parseFloat(plugin.dataset.minValue);
		var maxValue = parseFloat(plugin.dataset.maxValue);
		var units = label.dataset.units || "";
		var range = Math.abs(minValue - maxValue)
		var rotation = instance.rotation / 300 + .5;
		var fixed = parseFloat(plugin.dataset.fixed) || 1;
		var value;

		if (rotation <= 0) {
			rotation = 0;
		}

		if (rotation >= 1) {
			rotation = 1;
		}

		value = ((rotation * parseFloat(range)) + minValue).toFixed(fixed);

		if (label) {
			label.textContent = value + units;
		}

		plugin.dataset.value = value;
	}

	var _calc_rotation = function () {
		var value = parseFloat(plugin.dataset.value);
		var minValue = parseFloat(plugin.dataset.minValue);
		var maxValue = parseFloat(plugin.dataset.maxValue);
		var range = Math.abs(minValue - maxValue);
		var rotation = ((value - minValue) / range - .5) * 300;

		return rotation;
	}


	this.init = function () {
		_add_events();
	}

	this.update = function (key, val) {
		this.el.dataset[key] = val;

		var label = document.getElementById(this.el.dataset.label);
		var units = label.dataset.units || "";

		label.textContent = val + units;
		TweenLite.set(this.el, { rotation: _calc_rotation() });
	}

}

var plugins = [];

Array.prototype.forEach.call(document.querySelectorAll('.plugin'), function (el) {
	var plugin = new Plugin(el);
	plugin.init();
	plugins.push(plugin);
})

// helpers
function hasClass(el, className) {
	if (el.classList)
		return el.classList.contains(className)
	else
		return !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'))
}

function addClass(el, className) {
	if (el.classList)
		el.classList.add(className)
	else if (!hasClass(el, className)) el.className += " " + className
}

function removeClass(el, className) {
	if (el.classList)
		el.classList.remove(className)
	else if (hasClass(el, className)) {
		var reg = new RegExp('(\\s|^)' + className + '(\\s|$)')
		el.className = el.className.replace(reg, ' ')
	}
}

function Kick(context, canvasCtx) {
	this.context = context;
	this.canvasContext = canvasCtx;
	this.amp = {
		"level": 1,
		"attack": 0,
		"release": 1.5,
	};
	this.pitch = {
		"frequency": 150,
		"attack": 0,
		"release": 1.5,
	};
	this.filter = {
		"gain": 0,
		"frequency": 150,
		"resonance": 1.5,
	};
	this.delay = {
		"feedback": 0,
		"time": 0
	};
	this.compressor = {
		"threshold": -50,
		"knee": 40,
		"ratio": 12,
		"attack": 0,
		"release": 0.25,
	};
	this.distortion = {
		"gain": 0,
		"damage": 0
	};
};

Kick.prototype.loadPluginValues = function () {
	this.amp.level = parseFloat(document.querySelector('#mod-1').dataset.value);
	this.amp.attack = parseFloat(document.querySelector('#mod-2').dataset.value);
	this.amp.release = parseFloat(document.querySelector('#mod-3').dataset.value);

	this.pitch.frequency = parseFloat(document.querySelector('#mod-4').dataset.value);
	this.pitch.attack = parseFloat(document.querySelector('#mod-5').dataset.value);
	this.pitch.release = parseFloat(document.querySelector('#mod-6').dataset.value);

	this.filter.gain =
		parseFloat(document.querySelector('#mod-7').dataset.value);
	this.filter.frequency = parseFloat(document.querySelector('#mod-8').dataset.value);
	this.filter.resonance = parseFloat(document.querySelector('#mod-9').dataset.value);

	this.compressor.threshold = parseFloat(document.querySelector('#mod-10').dataset.value);
	this.compressor.knee = parseFloat(document.querySelector('#mod-11').dataset.value);
	this.compressor.ratio = parseFloat(document.querySelector('#mod-12').dataset.value);
	this.compressor.release = parseFloat(document.querySelector('#mod-15').dataset.value);

	this.delay.feedback =
		parseFloat(document.querySelector('#mod-16').dataset.value);
	this.delay.time =
		parseFloat(document.querySelector('#mod-17').dataset.value);

	this.distortion.gain =
		parseFloat(document.querySelector('#mod-18').dataset.value)

	this.distortion.damage =
		parseFloat(document.querySelector('#mod-19').dataset.value)
};

Kick.prototype.setup = function () {
	this.oscillatorNode = this.context.createOscillator();
	this.gainNode = this.context.createGain();
	this.filterNode = this.context.createBiquadFilter();

	this.delayNode = this.context.createDelay(6.0);
	this.delayFeedback = this.context.createGain();

	this.distortionNode = this.context.createWaveShaper();
	this.distortionGain = this.context.createGain();

	this.analyser = this.context.createAnalyser();
	this.analyser.minDecibels = -90;
	this.analyser.maxDecibels = -10;
	this.analyser.smoothingTimeConstant = 0.85;

	this.compressorNode = this.context.createDynamicsCompressor();

	this.oscillatorNode.connect(this.filterNode);

	this.filterNode.connect(this.distortionNode);
	this.distortionNode.connect(this.distortionGain);
	this.distortionGain.connect(this.gainNode);
	this.filterNode.connect(this.gainNode);

	this.delayNode.connect(this.delayFeedback);
	this.delayFeedback.connect(this.delayNode);

	this.gainNode.connect(this.compressorNode);

	this.compressorNode.connect(this.delayNode);
	this.compressorNode.connect(this.context.destination);
	this.compressorNode.connect(this.analyser);

	this.delayFeedback.connect(this.context.destination);
	this.delayFeedback.connect(this.analyser);

	this.gainNode.gain.setValueAtTime(0, this.context.currentTime);
	this.oscillatorNode.start(this.context.currentTime);

};

Kick.prototype.trigger = function (event) {
	var kickButton = document.querySelector('#kick-button');

	if (event && event.key) {
		addClass(kickButton, "active");
		setTimeout(removeClass.bind(this, kickButton, "active"), 50);
	}


	this.loadPluginValues();
	this.oscillatorNode.frequency.cancelScheduledValues(this.context.currentTime);
	this.gainNode.gain.cancelScheduledValues(this.context.currentTime);

	this.filterNode.gain.value = this.filter.gain;
	this.filterNode.frequency.value = this.filter.frequency;
	this.filterNode.Q.value = this.filter.resonance;

	this.delayNode.delayTime.value = this.delay.time;
	this.delayFeedback.gain.value = this.delay.feedback;

	this.distortionGain.gain.value = this.distortion.gain;
	this.distortionNode.curve = this.makeDistortionCurve(this.distortion.damage);

	this.compressorNode.threshold.value = this.compressor.threshold;
	this.compressorNode.knee.value = this.compressor.knee;
	this.compressorNode.ratio.value = this.compressor.ratio;
	this.compressorNode.attack.value = this.compressor.attack;
	this.compressorNode.release.value = this.compressor.release;

	this.gainNode.gain.setValueAtTime(0, this.context.currentTime);
	this.gainNode.gain.linearRampToValueAtTime(this.amp.level, this.context.currentTime + this.amp.attack);
	this.gainNode.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + this.amp.attack + this.amp.release);
	this.gainNode.gain.setValueAtTime(0, this.context.currentTime + this.amp.attack + this.amp.release);

	this.oscillatorNode.frequency.setValueAtTime(0.0001, this.context.currentTime);
	this.oscillatorNode.frequency.linearRampToValueAtTime(this.pitch.frequency, this.context.currentTime + this.pitch.attack);
	this.oscillatorNode.frequency.exponentialRampToValueAtTime(0.0001, this.context.currentTime + this.pitch.attack + this.pitch.release);

	visualize(this.analyser);
};

Kick.prototype.makeDistortionCurve = function (amount) {
	var k = typeof amount === 'number' ? amount : 0,
		n_samples = 44100,
		curve = new Float32Array(n_samples),
		deg = Math.PI / 180,
		i = 0,
		x;
	for (; i < n_samples; ++i) {
		x = i * 2 / n_samples - 1;
		curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
	}
	return curve;
};


var triggerButton = document.getElementById("kick-button");

var canvas = document.querySelector(".canvas");
var canvasCtx = canvas.getContext("2d");

canvas.width = 860;
canvasCtx.fillStyle = 'rgb(240, 235, 216)';
canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

var kick = new Kick(context);
kick.setup();

function visualize(analyser) {

	var WIDTH = canvas.width;
	var HEIGHT = canvas.height;

	var drawVisual;

	analyser.fftSize = 2048;
	var bufferLength = analyser.frequencyBinCount;
	var dataArray = new Uint8Array(bufferLength);

	var draw = function () {
		drawVisual = requestAnimationFrame(draw);
		analyser.getByteTimeDomainData(dataArray);
		canvasCtx.fillStyle = 'rgb(240, 235, 216)';
		canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
		canvasCtx.lineWidth = 2;
		canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

		canvasCtx.beginPath();

		var sliceWidth = WIDTH * 1.0 / bufferLength;
		var x = 0;

		for (var i = 0; i < bufferLength; i++) {

			var v = dataArray[i] / 128.0;
			var y = v * HEIGHT / 2;

			if (i === 0) {
				canvasCtx.moveTo(x, y);
			} else {
				canvasCtx.lineTo(x, y);
			}

			x += sliceWidth;
		}

		canvasCtx.lineTo(canvas.width, canvas.height / 2);
		canvasCtx.stroke();
	}

	draw();
}


window.addEventListener("keypress", kick.trigger.bind(kick));
triggerButton.addEventListener("click", kick.trigger.bind(kick));


// load presets

var loadPresetBtn = document.querySelector('.load-preset');
var data;

loadPresetBtn.addEventListener('click', function (evt) {

	if (!data) {
		var url =
			"https://gist.githubusercontent.com/Allegathor/cf54bbbc9138d35407d7d1733c381e34/raw/e38b9a08c2bd89f8b04669ac863d54367695f55f/preset.json";
		loadFromUrl(url);
	}

})

function loadFromUrl(url) {

	var sendReq = function () {
		xhr.open("GET", url, true);
		xhr.send();
	}

	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function () {
		if (this.readyState == 4) {
			if (this.status == 200) {
				data = JSON.parse(this.responseText);
				setPreset(data);
			} else {
				setTimeout(sendReq, 6000);
			}
		}
	};

	sendReq()
}


function setPreset(preset) {
	var k = 1;
	for (var plugin in preset) {
		var values = preset[plugin];

		switch (plugin) {
			case 'amp':
				plugins[0].update('value', values[0]);
				plugins[1].update('value', values[1]);
				plugins[2].update('value', values[2]);
				break;

			case 'pitch':
				plugins[3].update('value', values[0]);
				plugins[4].update('value', values[1]);
				plugins[5].update('value', values[2]);
				break;

			case 'distortion':
				plugins[16].update('value', values[0]);
				plugins[17].update('value', values[1]);
				break;
		}

	}

}

