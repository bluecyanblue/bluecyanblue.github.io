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

timer_started = false;
var break_timer_set_seconds, work_timer_set_seconds, seconds, timer_ms, prev_timestamp, prev_timer_text_chars, work_timer, paused;
work_timer = false; // for alternating between work/break blocks
work_timer_set_seconds = 25 * 60; // default
break_timer_set_seconds = 5 * 60; // default
const timer_button = document.getElementById('timer-button');
const timer_video = document.createElement('video');
const timer_canvas = document.createElement('canvas');
timer_canvas.width = 600;
timer_canvas.height = 675;
timer_video.srcObject = timer_canvas.captureStream();
document.getElementById('timer-wrapper').append(timer_canvas);
const pip_timer_worker = new Worker('pip_timer_worker.js');
const offscreen_canvas = timer_canvas.transferControlToOffscreen();
pip_timer_worker.postMessage({type: 'init', canvas: offscreen_canvas}, [offscreen_canvas]);
pip_timer_worker.postMessage({type: 'color-change', colors: {light: '#eee', dim: '#888', dark: '#222', alt_light: '#ccb', alt_dim: '#bba', alt_dark: '#aa8'}});

{
	const content_wrapper = document.getElementById('content-wrapper');
	
	const media_query = matchMedia('(min-aspect-ratio: 4/3)');
	window.addEventListener('resize', () => {
		if(media_query.matches){
				pip_timer_worker.postMessage({type: 'resize', dimensions_factor: content_wrapper.offsetHeight / 675});
		} else {
			pip_timer_worker.postMessage({type: 'resize', dimensions_factor: content_wrapper.offsetWidth / 600});
		}
	});
	window.dispatchEvent(new Event('resize'));
}

function set_up_picture_in_picture() {
	timer_video.play();
	timer_video.requestPictureInPicture();
	navigator.mediaSession.setActionHandler('play', () => {
		pip_timer_worker.postMessage({type: 'pause', pause: false});
		timer_button.classList.remove('timer-button-paused');
		timer_video.play();
		if(!noise_muted) noise_generation_context.resume();
	});
	navigator.mediaSession.setActionHandler('pause', () => {
		pip_timer_worker.postMessage({type: 'pause', pause: true});
		timer_button.classList.add('timer-button-paused');
		timer_video.pause();
		noise_generation_context.suspend();
	});
	navigator.mediaSession.setActionHandler('previoustrack', () => {
		pip_timer_worker.postMessage({type: 'reset'});
		timer_button.classList.remove('timer-button-paused');
		timer_video.play();
	});
	navigator.mediaSession.setActionHandler('nexttrack', () => {
		timer_button.classList.remove('timer-button-paused');
		timer_video.play();
		pip_timer_worker.postMessage({type: 'timer-start'});
	});
}

document.getElementById('timer-pip-button').addEventListener('click', () => {
	if(!timer_started) {
		pip_timer_worker.postMessage({type: 'timer-start'});
	} else {
		set_up_picture_in_picture();
	}
});

{
	const noise_buttons = [document.getElementById('white-noise-button'), document.getElementById('pink-noise-button'), document.getElementById('brown-noise-button'), document.getElementById('binaural-beats-button')]
	function start_noise(e) {
		const noise_generation_context = new AudioContext();
		noise_generation_context.suspend();
		noise_muted = true;

		// noise
		const white_noise_generation_buffer = noise_generation_context.createBuffer(1, 10 * noise_generation_context.sampleRate, noise_generation_context.sampleRate);
		const pink_noise_generation_buffer = noise_generation_context.createBuffer(1, 10 * noise_generation_context.sampleRate, noise_generation_context.sampleRate);
		const brown_noise_generation_buffer = noise_generation_context.createBuffer(1, 10 * noise_generation_context.sampleRate, noise_generation_context.sampleRate);

		const white_channel = white_noise_generation_buffer.getChannelData(0);
		const pink_channel = pink_noise_generation_buffer.getChannelData(0);
		const brown_channel = brown_noise_generation_buffer.getChannelData(0);
		
		// pinking variables
		var pink_0, pink_1, pink_2, pink_3, pink_4, pink_5, pink_6;
		pink_0 = pink_1 = pink_2 = pink_3 = pink_4 = pink_5 = pink_6 = 0.0;
		
		// browning variable
		var brown_0 = 0.0;
		
		for(let i = 0; i < 10 * noise_generation_context.sampleRate; i++) {
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
		
		const audio_source_nodes = [white_noise_generation_buffer_source, pink_noise_generation_buffer_source, brown_noise_generation_buffer_source, binaural_beats_source];
		function update_oscillator_frequencies() {
			oscillator_left.frequency.setValueAtTime(parseInt(binaural_base_freq.value, 10) + (parseInt(binaural_diff_range.value, 10) / 2), noise_generation_context.currentTime);
			oscillator_right.frequency.setValueAtTime(parseInt(binaural_base_freq.value, 10) - (parseInt(binaural_diff_range.value, 10) / 2), noise_generation_context.currentTime);
		}
		function generate_source_playing_function(source) {
			return () => {
				noise_muted = false;
				for(let i in audio_source_nodes) {
					audio_source_nodes[i].disconnect();
				}
				source.connect(noise_generation_context.destination);
				noise_generation_context.resume();
			};
		}
		for(let i in noise_buttons) {
			noise_buttons[i].addEventListener('click', generate_source_playing_function(audio_source_nodes[i]));
		}
		document.getElementById('binaural-beats-button').addEventListener('click', () => {update_oscillator_frequencies();})
		document.getElementById('stop-noise-button').addEventListener('click', () => {
			noise_muted = true;
			noise_generation_context.suspend();
		});
		binaural_diff_range.addEventListener('change', update_oscillator_frequencies);
		binaural_base_freq.addEventListener('change', update_oscillator_frequencies);
		for(let i in noise_buttons) {
			noise_buttons[i].removeEventListener('click', start_noise);
		}
		(generate_source_playing_function(audio_source_nodes[noise_buttons.indexOf(e.target)]))();
	}
	for(let i in noise_buttons) {
		noise_buttons[i].addEventListener('click', start_noise);
		noise_buttons[i].addEventListener('click', (e) => {
			for(let j in noise_buttons) {
				noise_buttons[j].classList.remove('button-selected');
			}
			e.target.classList.add('button-selected');
		});
	}
}

{
	const work_break_switch = document.getElementById('timer-work-break-switch');
	const controls_container = document.getElementById('timer-duration-controls');
	const hours_minutes_seconds_display = {hours: document.createElement('p'), minutes: document.createElement('p'), seconds: document.createElement('p')};
	function update_hours_minutes_seconds_display(units_vals) {
		hours_minutes_seconds_display.seconds.textContent = units_vals[0];
		hours_minutes_seconds_display.minutes.textContent = units_vals[1];
		hours_minutes_seconds_display.hours.textContent = units_vals.length == 3 ? units_vals[2] : '0';
		pip_timer_worker.postMessage({type: 'duration-settings-change', durations: {work_timer_duration: work_timer_set_seconds, break_timer_duration: break_timer_set_seconds}});
	}
	update_hours_minutes_seconds_display(util_s_to_hmmss(work_timer_set_seconds).split(':').reverse());
	let selected_work_timer = true; // select work/break
	
	const switch_work_timer = document.createElement('button');
	const switch_break_timer = document.createElement('button');
	switch_work_timer.addEventListener('click', () => {
		selected_work_timer = true;
		switch_work_timer.classList.add('button-selected');
		switch_break_timer.classList.remove('button-selected');
		update_hours_minutes_seconds_display(util_s_to_hmmss(work_timer_set_seconds).split(':').reverse());
	});
	switch_break_timer.addEventListener('click', () => {
		selected_work_timer = false;
		switch_break_timer.classList.add('button-selected');
		switch_work_timer.classList.remove('button-selected');
		update_hours_minutes_seconds_display(util_s_to_hmmss(break_timer_set_seconds).split(':').reverse());
	});
	switch_work_timer.classList.add('button-selected');
	switch_work_timer.textContent = 'Work';
	switch_break_timer.textContent = 'Break';
	work_break_switch.append(switch_work_timer);
	work_break_switch.append(switch_break_timer);
	
	for(let i = 0; i < 3; i++){
		const unit_division_container = document.createElement('div');
		const increase_button = document.createElement('button');
		const decrease_button = document.createElement('button');
		increase_button.classList.add('time-duration-controls-increase');
		
		const factor = 3600 / (60 ** i);
		increase_button.addEventListener('click', () => {
			if(selected_work_timer) {
				work_timer_set_seconds += factor;
			} else {
				break_timer_set_seconds += factor;
			}
			update_hours_minutes_seconds_display(util_s_to_hmmss(selected_work_timer ? work_timer_set_seconds : break_timer_set_seconds).split(':').reverse());
			if((selected_work_timer ? work_timer_set_seconds : break_timer_set_seconds) > factor) decrease_button.classList.remove('timer-duration-controls-locked');
		});
		switch_work_timer.addEventListener('click', () => {
			if((selected_work_timer ? work_timer_set_seconds : break_timer_set_seconds) <= factor) {
				decrease_button.classList.add('button-selected');
			} else {
				decrease_button.classList.remove('button-selected');
			}
		});
		decrease_button.addEventListener('click', () => {
			if( (selected_work_timer ? work_timer_set_seconds : break_timer_set_seconds) <= factor) return;
			if(selected_work_timer) {
				work_timer_set_seconds -= factor;
			} else {
				break_timer_set_seconds -= factor;
			}
			update_hours_minutes_seconds_display(util_s_to_hmmss(selected_work_timer ? work_timer_set_seconds : break_timer_set_seconds).split(':').reverse());
			if((selected_work_timer ? work_timer_set_seconds : break_timer_set_seconds) <= factor) decrease_button.classList.add('timer-duration-controls-locked');
		});
		switch_break_timer.addEventListener('click', () => {
			if((selected_work_timer ? work_timer_set_seconds : break_timer_set_seconds) <= factor) {
				decrease_button.classList.add('button-selected');
			} else {
				decrease_button.classList.remove('button-selected');
			}
		});
		if(work_timer_set_seconds <= factor) decrease_button.classList.add('button-selected');
		
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

timer_button.addEventListener('click', () => {
	pip_timer_worker.postMessage({type: 'timer-start'});
	timer_button.classList.remove('timer-button-paused');
	timer_button.addEventListener('click', () => {
		if(paused) {
			pip_timer_worker.postMessage({type: 'pause', pause: false});
			timer_button.classList.remove('timer-button-paused');
			timer_video.play();
			if(!noise_muted) noise_generation_context.resume();
		} else {
			pip_timer_worker.postMessage({type: 'pause', pause: true});
			timer_button.classList.add('timer-button-paused');
			timer_video.pause();
			noise_generation_context.suspend();
		}
	});
	document.getElementById('timer-reset-button').addEventListener('click', () => {
		pip_timer_worker.postMessage({type: 'reset'});
		timer_video.play();
	});
	document.getElementById('timer-skip-button').addEventListener('click', () => {
		timer_video.play();
		pip_timer_worker.postMessage({type: 'timer-start'});
	});
	document.addEventListener('visibilitychange', () => {
		if(document.hidden) {
			timer_video.play();
			try {
				set_up_picture_in_picture();
			} catch (err) {
				// pass
			}
		}
	});
}, {once: true});

{
	const dropdowns = document.getElementsByClassName('dropdown-reveal');
	for(let elem of dropdowns) {
		elem.addEventListener('click', () => {elem.classList.toggle('dropdown-is-hidden');});
	}
}