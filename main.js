// the timer button is broken kind of
// also add a nice interface to set the timer
function util_s_to_hmmss(s) {
	let seconds = s % 60;
	s -= seconds;
	s /= 60;
	let minutes = s % 60;
	s -= minutes;
	s /= 60;
	// s is now hours
	return (s ? `${s}:` : '') + `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function start_timer() {
	paused = false;
	timer_started = true;
	work_timer = !work_timer;
	seconds = work_timer ? set_seconds : 300; // make adjustable
	timer_ms = 0;
	if(work_timer) {
		const timer_outer = document.getElementsByClassName('timer-outer');
		for(let elem of timer_outer) {
			elem.setAttribute('fill', '#222');
		}
		const timer_inner = document.getElementsByClassName('timer-inner');
		for(let elem of timer_inner) {
			elem.setAttribute('fill', '#888');
		}
	} else {
		const timer_outer = document.getElementsByClassName('timer-outer');
		for(let elem of timer_outer) {
			elem.setAttribute('fill', '#aa8');
		}
		const timer_inner = document.getElementsByClassName('timer-inner');
		console.log(timer_inner.length);
		for(let elem of timer_inner) {
			elem.setAttribute('fill', '#bba');
		}
	}
	requestAnimationFrame((timestamp) => prev_timestamp = timestamp);
	requestAnimationFrame(update_timer);
	to_canvas_img.addEventListener('load', () => {
		timer_canvas_ctx.drawImage(to_canvas_img, 0, 0);
	});
	timer_video.play();
	timer_video.requestPictureInPicture(); // wrap in try-catch
	navigator.mediaSession.setActionHandler('play', () => {
		toggle_pause(false);
		timer_video.play();
		if(!noise_muted) noise_generation_context.resume();
	});
	navigator.mediaSession.setActionHandler('pause', () => {
		toggle_pause(true);
		timer_video.pause();
		noise_generation_context.suspend();
	});
	navigator.mediaSession.setActionHandler('previoustrack', () => {
		timer_ms = 0;
		if(paused) toggle_pause(false);
		timer_video.play();
	});
	navigator.mediaSession.setActionHandler('nexttrack', () => {
		timer_video.play();
		start_timer();
	});
}

function toggle_pause(pause) {
	paused = pause;
	if(!paused) {
		requestAnimationFrame((timestamp) => prev_timestamp = timestamp);
		requestAnimationFrame(update_timer);
	}
}

function update_timer(timestamp) {
	if(paused) return;
	if(timer_ms >= seconds * 1000) {
		// timer_circle.setAttribute('d', 'M 300 175 A 200 200 0 1 1 300 175');
		// timer_text.textContent = '00:00';
		// timer_text.setAttribute('font-size', parseInt(timer_text.getAttribute('font-size'), 10) * (250 / timer_text.getComputedTextLength()));
		// 	let url = to_canvas_serializer.serializeToString(timer_svg);
		// to_canvas_img.src = 'data:image/svg+xml; charset=utf8, ' + encodeURIComponent(url);
		// timer_button.addEventListener('click', start_timer, {once: true});
		start_timer();
		return;
	}
	timer_ms += timestamp - prev_timestamp;
	prev_timestamp = timestamp;
	let angle = ((timer_ms * 2 * Math.PI / 1000) / seconds) % (2 * Math.PI);
	timer_circle.setAttribute('d', `M 300 175 A 200 200 0 ${ angle > Math.PI ? 0 : 1} 0 ${300 + 200 * Math.sin(angle)} ${375 - 200 * Math.cos(angle)}`);
	let current_font_size = parseInt(timer_text.getAttribute('font-size'), 10);
	timer_text.textContent = util_s_to_hmmss(Math.ceil(seconds - (timer_ms / 1000)));
	let timer_text_width = timer_text.getComputedTextLength();
	let cur_timer_text_chars = timer_text.textContent.length;
	if(timer_text_width > 250 || cur_timer_text_chars != prev_timer_text_chars || timestamp == 0){
		timer_text.setAttribute('font-size', current_font_size * (250 / timer_text_width));
		prev_timer_text_chars = cur_timer_text_chars;
	}
	let url = to_canvas_serializer.serializeToString(timer_svg);
	to_canvas_img.src = 'data:image/svg+xml; charset=utf8, ' + encodeURIComponent(url);
	requestAnimationFrame(update_timer);
}

timer_started = false;
const timer_canvas = document.createElement('canvas');
timer_canvas.width = 600;
timer_canvas.height = 675;
const timer_canvas_ctx = timer_canvas.getContext('2d');
timer_canvas_ctx.fillStyle = 'white';
timer_canvas_ctx.fillRect(0, 0, timer_canvas.width, timer_canvas.height);
const timer_video = document.createElement('video');
const timer_canvas_stream = timer_canvas.captureStream(30)
timer_video.srcObject = timer_canvas_stream;

const noise_generation_context = new AudioContext();
noise_generation_context.suspend();
noise_muted = true;
const white_noise_generation_buffer = noise_generation_context.createBuffer(1, 30 * noise_generation_context.sampleRate, noise_generation_context.sampleRate);
const pink_noise_generation_buffer = noise_generation_context.createBuffer(1, 30 * noise_generation_context.sampleRate, noise_generation_context.sampleRate);
const brown_noise_generation_buffer = noise_generation_context.createBuffer(1, 30 * noise_generation_context.sampleRate, noise_generation_context.sampleRate);
{
	// noise
	const white_channel = white_noise_generation_buffer.getChannelData(0);
	const pink_channel = pink_noise_generation_buffer.getChannelData(0);
	const brown_channel = brown_noise_generation_buffer.getChannelData(0);
	
	// pinking variables
	var pink_0, pink_1, pink_2, pink_3, pink_4, pink_5, pink_6;
	pink_0 = pink_1 = pink_2 = pink_3 = pink_4 = pink_5 = pink_6 = 0.0;
	
	// browning variable
	var brown_0 = 0.0;
	
	for(let i = 0; i < 2 * noise_generation_context.sampleRate; i++) {
		white_channel[i] = 2 * Math.random() - 1;
		
		pink_0 = 0.99886 * pink_0 + white_channel[i] * 0.0555179;
		pink_1 = 0.99332 * pink_1 + white_channel[i] * 0.0750759;
		pink_2 = 0.96900 * pink_2 + white_channel[i] * 0.1538520;
		pink_3 = 0.86650 * pink_3 + white_channel[i] * 0.3104856;
		pink_4 = 0.55000 * pink_4 + white_channel[i] * 0.5329522;
		pink_5 = -0.7616 * pink_5 - white_channel[i] * 0.0168980;
		pink_channel[i] = (pink_0 + pink_1 + pink_2 + pink_3 + pink_4 + pink_5 + pink_6 + (white_channel[i] * 0.5362)) * 0.11;
		pink_6 = white_channel[i] * 0.115926;
		
		brown_channel[i] = (brown_0 + (0.02 * white_channel[i])) / (1.02);
		brown_0 = brown_channel[i];
		brown_channel[i] = 3.5 * brown_channel[i];
		
	}
	const white_noise_generation_buffer_source = new AudioBufferSourceNode(noise_generation_context);
	const pink_noise_generation_buffer_source = new AudioBufferSourceNode(noise_generation_context);
	const brown_noise_generation_buffer_source = new AudioBufferSourceNode(noise_generation_context);
	white_noise_generation_buffer_source.buffer = white_noise_generation_buffer;
	pink_noise_generation_buffer_source.buffer = pink_noise_generation_buffer;
	brown_noise_generation_buffer_source.buffer = brown_noise_generation_buffer;
	white_noise_generation_buffer_source.loop = true;
	pink_noise_generation_buffer_source.loop = true;
	brown_noise_generation_buffer_source.loop = true;
	white_noise_generation_buffer_source.start();
	pink_noise_generation_buffer_source.start();
	brown_noise_generation_buffer_source.start();
	
	// binaural beats
	const binaural_base_freq = document.getElementById('binaural-base-freq');
	const oscillator_left = new OscillatorNode(noise_generation_context, {frequency: parseInt(binaural_base_freq.value, 10)});
	const oscillator_right = new OscillatorNode(noise_generation_context, {frequency: parseInt(binaural_base_freq.value, 10)});
	const binaural_diff_range = document.getElementById('binaural-diff-range');
	const binaural_beats_source = new ChannelMergerNode(noise_generation_context, {numberOfInputs: 2});
	oscillator_left.connect(binaural_beats_source, 0, 0);
	oscillator_right.connect(binaural_beats_source, 0, 1);
	oscillator_left.start();
	oscillator_right.start();
	
	document.getElementById('white-noise-button').addEventListener('click', () => {
		noise_muted = false;
		
		white_noise_generation_buffer_source.disconnect();
		pink_noise_generation_buffer_source.disconnect();
		brown_noise_generation_buffer_source.disconnect();
		binaural_beats_source.disconnect();
		
		white_noise_generation_buffer_source.connect(noise_generation_context.destination);
		noise_generation_context.resume();
	});
	document.getElementById('pink-noise-button').addEventListener('click', () => {
		noise_muted = false;
		
		white_noise_generation_buffer_source.disconnect();
		pink_noise_generation_buffer_source.disconnect();
		brown_noise_generation_buffer_source.disconnect();
		binaural_beats_source.disconnect();
		
		pink_noise_generation_buffer_source.connect(noise_generation_context.destination);
		noise_generation_context.resume();
	});
	document.getElementById('brown-noise-button').addEventListener('click', () => {
		noise_muted = false;
		
		white_noise_generation_buffer_source.disconnect();
		pink_noise_generation_buffer_source.disconnect();
		brown_noise_generation_buffer_source.disconnect();
		binaural_beats_source.disconnect();
		
		brown_noise_generation_buffer_source.connect(noise_generation_context.destination);
		noise_generation_context.resume();
	});
	document.getElementById('stop-noise-button').addEventListener('click', () => {
		noise_muted = true;
		noise_generation_context.suspend();
	});
	document.getElementById('binaural-beats-button').addEventListener('click', () => {
		noise_muted = false;
		
		white_noise_generation_buffer_source.disconnect();
		pink_noise_generation_buffer_source.disconnect();
		brown_noise_generation_buffer_source.disconnect();
		binaural_beats_source.disconnect();
		
		oscillator_left.frequency.setValueAtTime(parseInt(binaural_base_freq.value, 10) + (parseInt(binaural_diff_range.value, 10) / 2), noise_generation_context.currentTime);
		oscillator_right.frequency.setValueAtTime(parseInt(binaural_base_freq.value, 10) - (parseInt(binaural_diff_range.value, 10) / 2), noise_generation_context.currentTime);
		binaural_beats_source.connect(noise_generation_context.destination);
		noise_generation_context.resume();
	});
	binaural_diff_range.addEventListener('change', () => {
		oscillator_left.frequency.setValueAtTime(parseInt(binaural_base_freq.value, 10) + (parseInt(binaural_diff_range.value, 10) / 2), noise_generation_context.currentTime);
		oscillator_right.frequency.setValueAtTime(parseInt(binaural_base_freq.value, 10) - (parseInt(binaural_diff_range.value, 10) / 2), noise_generation_context.currentTime);
	});
	binaural_base_freq.addEventListener('change', () => {
		oscillator_left.frequency.setValueAtTime(parseInt(binaural_base_freq.value, 10) + (parseInt(binaural_diff_range.value, 10) / 2), noise_generation_context.currentTime);
		oscillator_right.frequency.setValueAtTime(parseInt(binaural_base_freq.value, 10) - (parseInt(binaural_diff_range.value, 10) / 2), noise_generation_context.currentTime);
	})
	
}

var set_seconds, seconds, timer_ms, prev_timestamp, prev_timer_text_chars, work_timer, paused;
work_timer = false; // for alternating between work/break blocks
set_seconds = 25 * 60; // default
const to_canvas_img = document.createElement('img');
const to_canvas_serializer = new XMLSerializer();
const timer_svg = document.getElementById('timer-svg');
const timer_button = document.getElementById('timer-button');
const timer_circle = document.getElementById('timer-circle');
const timer_text = document.getElementById('timer-text');

{
	const controls_container = document.getElementById('timer-duration-controls');
	const hours_minutes_seconds_display = {hours: document.createElement('p'), minutes: document.createElement('p'), seconds: document.createElement('p')};
	hours_minutes_seconds_display.hours.textContent = '0';
	hours_minutes_seconds_display.minutes.textContent = '25';
	hours_minutes_seconds_display.seconds.textContent = '00';
	for(let i = 0; i < 3; i++){
		const unit_division_container = document.createElement('div');
		const increase_button = document.createElement('button');
		const decrease_button = document.createElement('button');
		const increase_icon = document.createElement('img');
		const decrease_icon = document.createElement('img');
		increase_icon.src = './triangle_arrow.svg';
		decrease_icon.src = './triangle_arrow.svg';
		increase_icon.style.transform = 'scale(1, -1)';
		increase_button.append(increase_icon);
		decrease_button.append(decrease_icon);
		// increase_icon.addEventListener('load', ()=> {
			// increase_button.height = increase_icon.height;
		// });
		// decrease_icon.addEventListener('load', ()=> {
			// decrease_button.height = decrease_icon.height;
		// });
		increase_button.style.height = '12px';
		decrease_button.style.height = '12px';
		increase_button.style.padding = '0';
		decrease_button.style.padding = '0';
		const factor = 3600 / (60 ** i);
		increase_button.addEventListener('click', () => {
			set_seconds += factor;
			const display_duration = util_s_to_hmmss(set_seconds).split(':').reverse();
			hours_minutes_seconds_display.seconds.textContent = display_duration[0];
			hours_minutes_seconds_display.minutes.textContent = display_duration[1];
			hours_minutes_seconds_display.hours.textContent = display_duration.length == 3 ? display_duration[2] : '0';
		});
		decrease_button.addEventListener('click', () => {
			if(set_seconds <= factor) return;
			set_seconds -= factor;
			const display_duration = util_s_to_hmmss(set_seconds).split(':').reverse();
			hours_minutes_seconds_display.seconds.textContent = display_duration[0];
			hours_minutes_seconds_display.minutes.textContent = display_duration[1];
			hours_minutes_seconds_display.hours.textContent = display_duration.length == 3 ? display_duration[2] : '0';
			if(set_seconds < factor) console.log('oh no'); // color button grey by adding a class (and then corresponding ungrey for increase)
		});
		unit_division_container.append(increase_button);
		switch(i) {
			case 0:
				unit_division_container.append(hours_minutes_seconds_display.hours);
				break;
			case 1:
				unit_division_container.append(hours_minutes_seconds_display.minutes);
				break;
			case 2:
				unit_division_container.append(hours_minutes_seconds_display.seconds);
				break;
		}
		unit_division_container.append(decrease_button);
		controls_container.append(unit_division_container);
	}
}
// still broken lol
timer_button.addEventListener('click', start_timer, {once: true});

document.getElementById('timer-pip-button').addEventListener('click', () => {
	if(!timer_started) {
		start_timer();
	} else {
		timer_video.requestPictureInPicture();
	}
});

{
	const dropdowns = document.getElementsByClassName('dropdown-reveal');
	for(let elem of dropdowns) {
		elem.addEventListener('click', () => {elem.classList.toggle('dropdown-is-hidden');});
	}
}

{
	const content_wrapper = document.getElementById('content-wrapper');
	const timer_wrapper = document.getElementById('timer-wrapper');
	const media_query = matchMedia('(min-aspect-ratio: 4/3)');
	window.addEventListener('resize', () => {
		if(media_query.matches){
				timer_wrapper.style.transform = `translate(${(600 * content_wrapper.offsetHeight / 675) * ((content_wrapper.offsetHeight / 675) - 1) / 2}px, ${content_wrapper.offsetHeight * (content_wrapper.offsetHeight / 675 - 1) / 2}px) scale(${content_wrapper.offsetHeight / 675})`; 
				timer_wrapper.style.width = `${600 * content_wrapper.offsetHeight / 675}px`;
				timer_wrapper.style.height = '';
		} else {
			timer_wrapper.style.transform = `translate(${(content_wrapper.offsetWidth - 600) / 2}px, ${(675 * content_wrapper.offsetWidth / 600) * ((content_wrapper.offsetWidth / 600) - 1) / 2}px) scale(${content_wrapper.offsetWidth / 600})`;
			timer_wrapper.style.width = '600px';
			timer_wrapper.style.height = `${675 * content_wrapper.offsetWidth / 600}px`;
		}
	});
	window.dispatchEvent(new Event('resize'));
}