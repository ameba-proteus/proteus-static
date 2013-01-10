
var connect = require('connect');
var stylus = require('./stylus');
var uglify = require('./uglifyjs');

function stat(option) {

	var app = option.app;
	var logger = option.logger || console;
	var paths = option.paths || {};
	var config = option.config || {};

	// apply compression
	if (config.compress) {
		app.use(connect.middleware.compress({
			level: config.compress.level || 9
		}));
	}

	// apply uglifyjs middleware
	if (config.uglifyjs) {
		app.use(uglify({
			config: config.uglifyjs,
			path: paths.dest,
			logger: logger
		}));
	}

	// apply stylus middleware
	if (config.stylus) {
		app.use(stylus({
			config: config.stylus,
			path: paths.src,
			logger: logger
		}));
	}

	// apply normal static provider
	app.use(connect.static(paths.dest));
}

module.exports = stat;
