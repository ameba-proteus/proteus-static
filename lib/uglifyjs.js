
var file = require('./file');
var url = require('url');
var uglify = require('uglify-js');

/**
 * uglify-js middleware
 */
function middleware(option) {

	// base path
	var path = option.path;
	// base config
	var config = option.config;
	// logger
	var logger = option.logger;

	// uglify-js compressor
	var compressor = uglify.Compressor({});

	/**
	 * compress data text with uglify-js
	 * @param data String source
	 * @param cb Function callback (err,data)
	 */
	function convert(data, cb) {
		if (config.compress === false) {
			cb(null,data);
			return;
		}
		try {
			var ast = uglify.parse(data, {
				filename: this.path
			});
			ast.figure_out_scope();
			ast = ast.transform(compressor);
			ast.figure_out_scope();
			ast.compute_char_frequency();
			ast.mangle_names();
			var code = ast.print_to_string({
				comments: /@license/
			});
			cb(null, code);
		} catch (e) {
			cb(e);
		}
	};

	var headers = {
		'Content-Type': 'text/javascript',
		'Cache-Control': 'public'
	};
	if ('maxAge' in config) {
		headers['Cache-Control'] += ',max-age='+config.maxAge;
	}

	// create items cache store
	var items = new file({
		path: path,
		convert: convert,
		encode: 'utf8',
		logger: logger,
		headers: headers
	});

	// pack info
	var packs = config.packs || {};

	// middleware function
	return function(req, res, next) {

		if ('GET' != req.method && 'HEAD' != req.method) return next();

		var pathname = url.parse(req.originalUrl).pathname;
		if (/\.js$/.test(pathname)) {
			// omit parent reference
			pathname = pathname.replace('../','');

			// packed files
			var pack = packs[pathname];
			if (pack) {
				var data = '';
				var index = 0;
				function get() {
					var filename = pack[index];
					items.get(filename, got);
				}
				function got(err, item) {
					if (err) {
						return next(err);
					}
					if (!item.data) {
						res.send(404, 'A part of packed file does not exist');
						return;
					}
					data += item.data;
					if (++index >= pack.length) {
						if (err) {
							// error
							console.log(err);
						}
						for (var name in headers) {
							res.set(name, headers[name]);
						}
						res.send(data);
					} else {
						get();
					}
				}
				get();
				return;
			}

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
