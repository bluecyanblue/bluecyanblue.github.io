navigator.serviceWorker.register('sw.js');

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

function queue_frame(callback) {
	setTimeout(() => {callback(performance.now())}, 0);
}

function start_timer() {
	timer_started = true;
	work_timer = !work_timer;
	seconds = work_timer ? work_timer_set_seconds : break_timer_set_seconds;
	timer_ms = 0;
	if(work_timer) {
		in_svg_timer_wrapper.classList.remove('timer-break');
	} else {
		in_svg_timer_wrapper.classList.add('timer-break');
	}
	toggle_pause(false);
}

function toggle_pause(pause) {
	paused = pause;
	if(!paused) {
		queue_frame((timestamp) => prev_timestamp = timestamp);
		queue_frame(update_timer);
	}
}

function internal_update_timer(timestamp, curr_paused) { // internally pass in paused to avoid race condition
	if(curr_paused) return;
	if(timer_ms >= seconds * 1000) {
		start_timer();
		return;
	}
	
	if(work_timer) total_work_time += timestamp - prev_timestamp;
	update_reward_display();
	
	timer_ms += timestamp - prev_timestamp;
	prev_timestamp = timestamp;
	let angle = ((timer_ms * 2 * Math.PI / 1000) / seconds) % (2 * Math.PI);
	timer_circle.setAttribute('d', `M 300 175 A 200 200 0 ${ angle > Math.PI ? 0 : 1} 0 ${300 + 200 * Math.sin(angle)} ${375 - 200 * Math.cos(angle)}`);
	let current_font_size = parseInt(getComputedStyle(timer_text).fontSize, 10);
	timer_text.textContent = util_s_to_hmmss(Math.ceil(seconds - (timer_ms / 1000)));
	let timer_text_width = timer_text.getComputedTextLength();
	let cur_timer_text_chars = timer_text.textContent.length;
	if(timer_text_width > 250 || cur_timer_text_chars != prev_timer_text_chars || timestamp == 0){
		timer_text.style.fontSize = current_font_size * (250 / timer_text_width);
		prev_timer_text_chars = cur_timer_text_chars;
	}
	let url = to_canvas_serializer.serializeToString(timer_svg);
	to_canvas_img.src = 'data:image/svg+xml; charset=utf8, ' + encodeURIComponent(url);
	queue_frame(update_timer);
}

function update_timer(timestamp) {
	internal_update_timer(timestamp, paused);
}

function update_reward_display() {
	reward_work_time_display.textContent = util_s_to_hmmss(Math.floor(total_work_time / 1000));
	let rewards_number = Math.floor((total_work_time / 1000) / 600) - rewards_claimed;
	reward_number_display.textContent = `${rewards_number} ${reward_type_dog_person ? 'woof(s)' : 'meow(s)'} (${util_s_to_hmmss(600 - (Math.floor(total_work_time / 1000) % 600))} until next reward)`;
	reward_icon_display.textContent = (reward_type_dog_person ? '🐶' : '🐱').repeat(rewards_number);
}

function set_up_picture_in_picture() {
	if(!timer_started) timer_button.click();
	const picture_in_picture_promise = timer_video.requestPictureInPicture();
	// you have to unpause, pause, and unpause the video or else the pause/play button breaks
	timer_video.play().then(() => {
		timer_video.pause();
		timer_video.play();
	});	
	navigator.mediaSession.setActionHandler('play', () => {
		toggle_pause(false);
		timer_button.classList.remove('timer-button-paused');
		timer_video.play();
		navigator.mediaSession.playbackState = 'playing';
		if(!noise_muted && noise_generation_context) noise_generation_context.resume();
	});
	navigator.mediaSession.setActionHandler('pause', () => {
		toggle_pause(true);
		timer_button.classList.add('timer-button-paused');
		timer_video.pause();
		navigator.mediaSession.playbackState = 'paused';
		if(noise_generation_context) noise_generation_context.suspend();
	});
	navigator.mediaSession.setActionHandler('previoustrack', () => {
		timer_ms = 0;
		if(paused) toggle_pause(false);
		timer_button.classList.remove('timer-button-paused');
		timer_video.play();
		navigator.mediaSession.playbackState = 'playing';
		if(!noise_muted && noise_generation_context) noise_generation_context.resume();
	});
	navigator.mediaSession.setActionHandler('nexttrack', () => {
		timer_ms = seconds * 1000;
		if(paused) toggle_pause(false);
		timer_button.classList.remove('timer-button-paused');
		timer_video.play();
		navigator.mediaSession.playbackState = 'playing';
		if(!noise_muted && noise_generation_context) noise_generation_context.resume();
	});
	return picture_in_picture_promise;
}

var timer_started, break_timer_set_seconds, work_timer_set_seconds, seconds, timer_ms, prev_timestamp, prev_timer_text_chars, work_timer, paused, noise_generation_context, noise_muted, total_work_time, rewards_claimed, reward_type_dog_person;
timer_started = false;
noise_generation_context = null;
noise_muted = true;
work_timer = false; // for alternating between work/break blocks
work_timer_set_seconds = 25 * 60; // default
break_timer_set_seconds = 5 * 60; // default

total_work_time = 0;
rewards_claimed = 0;
reward_type_dog_person = false;
const reward_work_time_display = document.getElementById('reward-work-time-display');
const reward_number_display = document.getElementById('reward-number-display');
const reward_icon_display = document.getElementById('reward-icon-display');

const in_svg_timer_wrapper = document.getElementById('in-svg-timer-wrapper');
const timer_button = document.getElementById('timer-button');

const timer_svg = document.getElementById('timer-svg');
const timer_circle = document.getElementById('timer-circle');
const timer_text = document.getElementById('timer-text');

// set up video element for picture-in-picture
const timer_video = document.createElement('video');
const timer_canvas = document.createElement('canvas');
timer_canvas.width = parseInt(timer_svg.getAttribute('width'), 10);
timer_canvas.height = parseInt(timer_svg.getAttribute('height'), 10);
const timer_canvas_context = timer_canvas.getContext('2d');
timer_canvas_context.fillStyle = 'white';
timer_canvas_context.fillRect(0, 0, timer_canvas.width, timer_canvas.height);
const to_canvas_img = document.createElement('img');
to_canvas_img.addEventListener('load', () => {
	timer_canvas_context.drawImage(to_canvas_img, 0, 0);
});
const to_canvas_serializer = new XMLSerializer();
timer_video.srcObject = timer_canvas.captureStream(30);

{
	const work_break_switch = document.getElementById('timer-work-break-switch');
	const controls_container = document.getElementById('timer-duration-controls');
	const hours_minutes_seconds_display = {hours: document.createElement('p'), minutes: document.createElement('p'), seconds: document.createElement('p')};
	function update_hours_minutes_seconds_display(units_vals) {
		hours_minutes_seconds_display.seconds.textContent = units_vals[0];
		hours_minutes_seconds_display.minutes.textContent = units_vals[1];
		hours_minutes_seconds_display.hours.textContent = units_vals.length == 3 ? units_vals[2] : '0';
	}
	update_hours_minutes_seconds_display(util_s_to_hmmss(work_timer_set_seconds).split(':').reverse());
	let selected_work_timer = true; // select work/break
	
	let scroll_update_mutex = false; // for locking the interface during scrolling
	
	const duration_decrease_buttons = [];
	
	function update_locked_duration_buttons() {
		for (i in duration_decrease_buttons) {
			if((selected_work_timer ? work_timer_set_seconds : break_timer_set_seconds) > (3600 / (60 ** i)) || (i != 2 && (selected_work_timer ? work_timer_set_seconds : break_timer_set_seconds) == (3600 / (60 ** i)))) {
				duration_decrease_buttons[i].classList.remove('button-selected');
			} else {
				duration_decrease_buttons[i].classList.add('button-selected');
			}
		}
	}
	
	const switch_work_timer = document.createElement('button');
	const switch_break_timer = document.createElement('button');
	switch_work_timer.addEventListener('click', () => {
		if(scroll_update_mutex) return;
		selected_work_timer = true;
		switch_work_timer.classList.add('button-selected');
		switch_break_timer.classList.remove('button-selected');
		update_hours_minutes_seconds_display(util_s_to_hmmss(work_timer_set_seconds).split(':').reverse());
		update_locked_duration_buttons();
	});
	switch_break_timer.addEventListener('click', () => {
		if(scroll_update_mutex) return;
		selected_work_timer = false;
		switch_break_timer.classList.add('button-selected');
		switch_work_timer.classList.remove('button-selected');
		update_hours_minutes_seconds_display(util_s_to_hmmss(break_timer_set_seconds).split(':').reverse());
		update_locked_duration_buttons();
	});
	switch_work_timer.classList.add('button-selected');
	switch_work_timer.textContent = 'Work';
	switch_break_timer.textContent = 'Break';
	work_break_switch.append(switch_work_timer);
	work_break_switch.append(switch_break_timer);
	
	for(let i = 0; i < 3; i++) {
		let current_unit_division;
		switch(i) {
			case 0:
				current_unit_division = 'hours';
				break;
			case 1:
				current_unit_division = 'minutes';
				break;
			case 2:
				current_unit_division = 'seconds';
				break;
		}
		const unit_division_container = document.createElement('div');
		const increase_button = document.createElement('button');
		const decrease_button = document.createElement('button');
		duration_decrease_buttons.push(decrease_button);
		increase_button.classList.add('time-duration-controls-increase');
		
		const factor = 3600 / (60 ** i);
		increase_button.addEventListener('click', () => {
			if(scroll_update_mutex) return;
			if(selected_work_timer) {
				work_timer_set_seconds += factor;
			} else {
				break_timer_set_seconds += factor;
			}
			update_hours_minutes_seconds_display(util_s_to_hmmss(selected_work_timer ? work_timer_set_seconds : break_timer_set_seconds).split(':').reverse());
			update_locked_duration_buttons();
		});
		decrease_button.addEventListener('click', () => {
			if((selected_work_timer ? work_timer_set_seconds : break_timer_set_seconds) < factor || scroll_update_mutex) return;
			if(selected_work_timer) {
				work_timer_set_seconds -= factor;
				work_timer_set_seconds = Math.max(1, work_timer_set_seconds);
			} else {
				break_timer_set_seconds -= factor;
				break_timer_set_seconds = Math.max(1, break_timer_set_seconds);
			}
			update_hours_minutes_seconds_display(util_s_to_hmmss(selected_work_timer ? work_timer_set_seconds : break_timer_set_seconds).split(':').reverse());
			update_locked_duration_buttons();
		});
		update_locked_duration_buttons();
		
		unit_division_container.append(increase_button);
		unit_division_container.append(hours_minutes_seconds_display[current_unit_division]);
		
		unit_division_container.append(decrease_button);
		controls_container.append(unit_division_container);
		
		{
			let cumulative_scroll = 0;
			let current_value = parseInt(hours_minutes_seconds_display[current_unit_division].textContent, 10);
			let scrolling_timeout = null;
			hours_minutes_seconds_display[current_unit_division].addEventListener('wheel', (e) => {
				e.preventDefault();
				if(scroll_update_mutex && scroll_update_mutex != current_unit_division) return;
				e.preventDefault();
				if(!scroll_update_mutex) current_value = parseInt(hours_minutes_seconds_display[current_unit_division].textContent, 10);
				scroll_update_mutex = current_unit_division;
				work_break_switch.classList.add('scroll-mutex-locked');
				controls_container.classList.add('scroll-mutex-locked');
				if(scrolling_timeout) clearTimeout(scrolling_timeout);
				let deltaY = - e.deltaY / 100;
				if(current_value + cumulative_scroll + deltaY < 0) {
					cumulative_scroll = -current_value;
				} else {
					cumulative_scroll += deltaY;
				}
				let unit_display_val = Math.floor(current_value + cumulative_scroll).toString();
				if(unit_display_val.length == 1 && current_unit_division != 'hours') unit_display_val = '0' + unit_display_val;
				hours_minutes_seconds_display[current_unit_division].textContent = unit_display_val;
				scrolling_timeout = setTimeout(() => {
					if(selected_work_timer) {
						work_timer_set_seconds += Math.floor(cumulative_scroll) * factor;
						work_timer_set_seconds = Math.max(1, work_timer_set_seconds);	
					} else {
						break_timer_set_seconds += Math.floor(cumulative_scroll) * factor;
						break_timer_set_seconds = Math.max(1, break_timer_set_seconds);
					}
					update_hours_minutes_seconds_display(util_s_to_hmmss(selected_work_timer ? work_timer_set_seconds : break_timer_set_seconds).split(':').reverse());
					cumulative_scroll = 0;
					current_value = parseInt(hours_minutes_seconds_display[current_unit_division].textContent, 10);
					scrolling_timeout = null;
					scroll_update_mutex = false;
					work_break_switch.classList.remove('scroll-mutex-locked');
					controls_container.classList.remove('scroll-mutex-locked');
					update_locked_duration_buttons();
				}, 1000); // update the actual value once scrolling is done
			});	
		}
		{
			let current_value = parseInt(hours_minutes_seconds_display[current_unit_division].textContent, 10);
			let interaction = null;
			hours_minutes_seconds_display[current_unit_division].addEventListener('pointerdown', (e) => {
				e.preventDefault();
				if(scroll_update_mutex) return;
				current_value = parseInt(hours_minutes_seconds_display[current_unit_division].textContent, 10);
				function onpointermove_callback(e) {
					e.preventDefault();
					if(!interaction) interaction = {id: e.pointerId, y: e.pageY};
					if(e.pointerId != interaction.id) return;
					scroll_update_mutex = current_unit_division;
					work_break_switch.classList.add('scroll-mutex-locked');
					controls_container.classList.add('scroll-mutex-locked');
					let unit_display_val = Math.max(0, Math.floor(current_value + ((interaction.y - e.pageY) / 10))).toString();
					if(unit_display_val.length == 1 && current_unit_division != 'hours') unit_display_val = '0' + unit_display_val;
					hours_minutes_seconds_display[current_unit_division].textContent = unit_display_val;
				}
				function onpointerup_callback(e) {
					e.preventDefault();
					if(!interaction || e.pointerId != interaction.id) return;
					scroll_update_mutex = false;
					work_break_switch.classList.remove('scroll-mutex-locked');
					controls_container.classList.remove('scroll-mutex-locked');
					if(selected_work_timer) {
						work_timer_set_seconds += Math.max(-current_value, Math.floor((interaction.y - e.pageY) / 10)) * factor;
						work_timer_set_seconds = Math.max(1, work_timer_set_seconds);				
					} else {
						break_timer_set_seconds += Math.max(-current_value, Math.floor((interaction.y - e.pageY) / 10)) * factor;
						break_timer_set_seconds = Math.max(1, break_timer_set_seconds);
					}
					update_hours_minutes_seconds_display(util_s_to_hmmss(selected_work_timer ? work_timer_set_seconds : break_timer_set_seconds).split(':').reverse());
					current_value = parseInt(hours_minutes_seconds_display[current_unit_division].textContent, 10);
					interaction = null;
					update_locked_duration_buttons();
					window.removeEventListener('pointermove', onpointermove_callback);
					window.removeEventListener('pointerup', onpointerup_callback);
				}
				window.addEventListener('pointermove', onpointermove_callback);
				window.addEventListener('pointerup', onpointerup_callback);
			});
		}
	}
}

{
	const noise_buttons = [document.getElementById('white-noise-button'), document.getElementById('pink-noise-button'), document.getElementById('brown-noise-button'), document.getElementById('binaural-beats-button')]
	const mute_button = document.getElementById('mute-button');
	function start_noise(e) {
		noise_generation_context = new AudioContext();
		noise_generation_context.suspend();

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
		binaural_diff_range.addEventListener('change', update_oscillator_frequencies);
		binaural_base_freq.addEventListener('change', update_oscillator_frequencies);
		for(let i in noise_buttons) {
			noise_buttons[i].removeEventListener('click', start_noise);
		}
		(generate_source_playing_function(audio_source_nodes[noise_buttons.indexOf(e.target)]))();
	}
	for(let i in noise_buttons) {
		noise_buttons[i].addEventListener('click', start_noise, {once: true});
		noise_buttons[i].addEventListener('click', (e) => {
			for(let j in noise_buttons) {
				noise_buttons[j].classList.remove('button-selected');
			}
			mute_button.classList.remove('button-selected');
			e.target.classList.add('button-selected');
		});
	}
	mute_button.addEventListener('click', () => {
		for(let j in noise_buttons) {
			noise_buttons[j].classList.remove('button-selected');
		}
		mute_button.classList.add('button-selected');
		noise_muted = true;
		if (noise_generation_context) noise_generation_context.suspend();
	});
	mute_button.classList.add('button-selected');
}

timer_button.addEventListener('click', () => {
	start_timer();
	timer_button.classList.remove('timer-button-paused');
	navigator.mediaSession.playbackState = 'playing';
	timer_button.addEventListener('click', () => {
		if(paused) {
			toggle_pause(false);
			timer_button.classList.remove('timer-button-paused');
			timer_video.play();
			navigator.mediaSession.playbackState = 'playing';
			if(!noise_muted && noise_generation_context) noise_generation_context.resume();
		} else {
			toggle_pause(true);
			timer_button.classList.add('timer-button-paused');
			timer_video.pause();
			navigator.mediaSession.playbackState = 'paused';
			if(noise_generation_context) noise_generation_context.suspend();
		}
	});
	document.getElementById('timer-reset-button').addEventListener('click', () => {
		timer_ms = 0;
		if(paused) toggle_pause(false);
		timer_button.classList.remove('timer-button-paused');
		timer_video.play();
		navigator.mediaSession.playbackState = 'playing';
	});
	document.getElementById('timer-skip-button').addEventListener('click', () => {
		timer_ms = seconds * 1000;
		if(paused) toggle_pause(false);
		timer_button.classList.remove('timer-button-paused');
		timer_video.play();
		navigator.mediaSession.playbackState = 'playing';
	});
	document.addEventListener('visibilitychange', () => {
		if(document.pictureInPictureElement) return;
		if(document.hidden) {
			timer_video.play();
			navigator.mediaSession.playbackState = 'playing';
			set_up_picture_in_picture().catch((err) => {/* pass */});
		}
	});
}, {once: true});

document.getElementById('timer-pip-button').addEventListener('click', () => {
	set_up_picture_in_picture().catch((err) => {
		let error_message;
		switch(err.name) {
			case 'NotSupportedError':
				error_message = 'Not supported';
				break;
			case 'SecurityError':
				error_message = 'Blocked by permissions/security';
				break;
			case 'InvalidStateError':
				error_message = 'Unable to load video/player';
				break;
			case 'NotAllowedError':
				error_message = 'Unable to register user permission';
				break;
			default:
				error_message = 'Unknown error';
				break;
		}
		alert('Couldn\'t set up Picture-in-Picture mode: ' + error_message);
	});
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

{
	const reward_claim_button = document.getElementById('reward-claim-button');
	const reward_type_switch_button = document.getElementById('reward-type-switch-button');
	let reward_claim_mutex = false;
	
	const meow_sound = document.createElement('audio');
	const woof_sound = document.createElement('audio');
	meow_sound.src = 'media/meow.mp3';
	woof_sound.src = 'media/woof.mp3';
	meow_sound.addEventListener('ended', () => {reward_claim_mutex = false});
	woof_sound.addEventListener('ended', () => {reward_claim_mutex = false});
	
	reward_claim_button.addEventListener('click', () => {
		if(Math.floor((total_work_time / 1000) / 600) <= rewards_claimed || reward_claim_mutex) return;
		reward_claim_mutex = true;
		rewards_claimed += 1;
		if(reward_type_dog_person) {
			woof_sound.play();
		} else {
			meow_sound.play();
		}
		update_reward_display();
	});
	reward_type_switch_button.addEventListener('click', () => {
		reward_type_dog_person = !reward_type_dog_person;
		reward_type_switch_button.classList.toggle('reward-type-dog-person');
		update_reward_display();
	});
}