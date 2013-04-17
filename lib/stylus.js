
var file = require('./file');
var stylus = require('stylus');

/**
 * stylus css middleware
 */
function middleware(option) {

	// base path
	var path = option.path;
	// base config
	var config = option.config;
	// logger
	var logger = option.logger;

	function convert(data, cb) {
		try {
			stylus(data)
			.set('filename', this.path)
			.set('compress', config.compress !== false)
			.render(function(err, data) {
				if (err) {
					cb(err);
				} else {
					cb(null, data);
				}
			});
		} catch (e) {
			cb(e);
		}
	}

	var headers = {
		'Content-Type': 'text/css',
		'Cache-Control': 'public'
	};
	if ('maxAge' in config) {
		headers['Cache-Control'] += ',max-age='+config.maxAge;
	}

	var items = new file({
		path: path,
		convert: convert,
		encode: 'utf8',
		logger: logger,
		headers: headers
	});

	return function(req, res, next) {

		if ('GET' !== req.method && 'HEAD' !== req.method) {
			return next();
		}

		var pathname = req.path;
		if (/\.css$/.test(pathname)) {
			// omit parent reference
			pathname = pathname.replace('../','');
			// change name to stylus
			pathname = pathname.replace(/\.css$/,'.styl');

			items.get(
				pathname,
				function(err, item) {
					if (err) {
						next(err);
					} else {
						item.send(req, res);
					}
				}
			);
		} else {
			next();
		}

	};
}

module.exports = middleware;

