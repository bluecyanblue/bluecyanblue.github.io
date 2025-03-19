self.addEventListener('install', (e) => {
	e.waitUntil((async () => {
		(await caches.open('v1')).addAll([
			'/',
			'/index.html',
			'/main.js',
			'/style.css',
			'/media/bahnschrift.ttf',
			'/media/bahnschrift.woff',
			'/media/bahnschrift.woff2',
			'/media/info-icon.svg',
			'/media/install.svg',
			'/media/mute.svg',
			'/media/pallete.svg',
			'/media/pause.svg',
			'/media/picture-in-picture.svg',
			'/media/play.svg',
			'/media/reset.svg',
			'/media/skip.svg',
			'/media/triangle-arrow.svg',
			'/media/meow.mp3',
			'/media/woof.mp3',
		]);
	})());
});

self.addEventListener('fetch', (e) => {
	e.respondWith((async () => {
		let req = e.request;
		if(e.request.headers.has('Range')) {
			let headers = {};
			for(let header of req.headers) headers[header[0]] = header[1];
			delete headers['Range'];
			req = new Request(req.url, headers);
		}
		try {
			const networkResource = await fetch(req);
			(await caches.open('v1')).put(req, networkResource.clone());
			return networkResource;
		} catch(err) {
			const cachedResource = await caches.match(req);
			if(cachedResource) return cachedResource;
			return new Response('Resource not available', {status: 408, headers: {'Content-Type': 'text/plain'}});
		}
	})());
});