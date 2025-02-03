self.addEventListener('install', (e) => {
	e.waitUntil(async () => {
		(await caches.open('v1')).addAll([
			'/',
			'/index.html',
			'/main.js',
			'/style.js',
			'/media/bahnschrift.ttf',
			'/media/bahnschrift.woff',
			'/media/bahnschrift.woff2',
			'/media/install.svg',
			'/media/mute.svg',
			'/media/pause.svg',
			'/media/picture-in-picture.svg',
			'/media/play.svg',
			'/media/reset.svg',
			'/media/skip.svg',
			'/media/triangle-arrow.svg',
			'/media/meow.mp3',
			'/media/woof.mp3',
		]);
	});
});

self.addEventListener('fetch', (e) => {
	e.respondWith(async () => {
		const networkResource = await fetch(e.request);
		if(networkResource) {
			(await caches.open('v1')).put(e.request, networkResource.clone());
			console.log(networkResource);
			return networkResource;
		}
		const cachedResource = await caches.match(e.request);
		console.log(cachedResource);
		if(cachedResource) return cachedResource;
		return new Response('Resource not available', {status: 408, headers: {'Content-Type': 'text-plain'}});
	});
});