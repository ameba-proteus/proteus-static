
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
			var code = ast.print_to_string();
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

	// middleware function
	return function(req, res, next) {

		if ('GET' != req.method && 'HEAD' != req.method) return next();

		var pathname = url.parse(req.originalUrl).pathname;
		if (/\.js$/.test(pathname)) {
			// omit parent reference
			pathname = pathname.replace('../','');

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
