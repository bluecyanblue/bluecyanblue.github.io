var timer_canvas, timer_canvas_context, paused, timer_dimensions, timer_durations, curr_duration, timer_ms, prev_timestamp, timer_break, timer_colors;
paused = true;
timer_break = true;

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
	timer_break = !timer_break;
	curr_duration = timer_break ? timer_durations.work_timer_duration : timer_durations.break_timer_duration;
	timer_ms = 0;
}

function draw_timer(timestamp) {
	timer_canvas_context.fillStyle = 'white';
	timer_canvas_context.fillRect(0, 0, timer_canvas_context.width, timer_canvas_context.length);
	timer_canvas_context.fillStyle = timer_break ? timer_colors.alt_dark : timer_colors.dark;
	timer_canvas_context.roundRect(225 * timer_dimensions_factor, 50 * timer_dimensions_factor, 150 * timer_dimensions_factor, 50 * timer_dimensions_factor, [25 * timer_dimensions_factor]);
	timer_canvas_context.fill();
	timer_canvas_context.fillRect(275 * timer_dimensions_factor, 75 * timer_dimensions_factor, 50 * timer_dimensions_factor, 75 * timer_dimensions_factor);
	timer_canvas_context.beginPath();
	timer_canvas_context.arc(300 * timer_dimensions_factor, 375 * timer_dimensions_factor, 250 * timer_dimensions_factor, 0, 2 * Math.PI);
	timer_canvas_context.fill();
	timer_canvas_context.fillStyle = timer_break ? timer_colors.alt_dim : timer_colors.dim;
	timer_canvas_context.beginPath();
	timer_canvas_context.arc(300 * timer_dimensions_factor, 375 * timer_dimensions_factor, 200 * timer_dimensions_factor, 0, 2 * Math.PI);
	timer_canvas_context.fill();
	
	if(!paused) {
		timer_ms += timestamp - prev_timestamp;
	}
	timer_canvas_context.strokeStyle = 'white';
	timer_canvas_context.lineWidth = 50 * timer_dimensions_factor;
	timer_canvas_context.beginPath();
	timer_canvas_context.arc(300 * timer_dimensions_factor, 375 * timer_dimensions_factor, 200 * timer_dimensions_factor, -0.5 * Math.PI, (((timer_ms / 1000) / curr_duration) * 2 - 0.5) * Math.PI, true);
	timer_canvas_context.stroke();
	
	let timer_text = util_s_to_hmmss(Math.ceil(curr_duration - (timer_ms / 1000)));
	timer_canvas_context.textAlign = 'center';
	timer_canvas_context.textBaseline = 'middle';
	timer_canvas_context.font = 'bold 1px Bahnschrift, "Trebuchet MS", sans-serif';
	timer_canvas_context.font = `bold ${250 * timer_dimensions_factor / timer_canvas_context.measureText(timer_text).width}px Bahnschrift, "Trebuchet MS", sans-serif`;
	timer_canvas_context.fillStyle = 'white';
	timer_canvas_context.fillText(timer_text, 300 * timer_dimensions_factor, 375 * timer_dimensions_factor);
	prev_timestamp = timestamp;
	requestAnimationFrame(draw_timer);
}

self.addEventListener('message', (message) => {
	console.log('yay');
	switch(message.type) {
		case 'init':
			timer_canvas = message.canvas;
			timer_canvas_context = timer_canvas.getContext('2d');
			timer_ms = 0;
			requestAnimationFrame((timestamp) => {prev_timestamp = timestamp});
			requestAnimationFrame(draw_timer);
			break;
		case 'timer-start':
			start_timer();
			break;
		case 'pause':
			paused = message.pause;
			break;
		case 'reset':
			timer_ms = 0;
			paused = false;
			break;
		case 'duration-settings-change':
			timer_durations = message.durations;
			break;
		case 'resize':
			timer_dimensions_factor = message.dimensions_factor;
			timer_canvas.width = 600 * timer_dimensions_factor;
			timer_canvas.height = 675 * timer_dimensions_factor;
			break;
		case 'color-change':
			timer_colors = message.colors;
			break;
	}
});