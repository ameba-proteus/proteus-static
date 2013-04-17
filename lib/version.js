
function fixPrefix(version) {

	var pattern = new RegExp(/^\/v([0-9]+)\//);

	return function(req, res, next) {

		var url = req.url;

		// strip version string
		var matched = pattern.exec(url);
		if (matched) {

			var requestVersion = parseInt(matched[1], 10);
			// returns not found if requested version is newer.
			if (requestVersion > version) {
				res.send(404);
				return;
			}
			// rewrite url to non versioned
			req.url = url.substring(matched[0].length - 1);
		}

		next();
	};

}

exports.fixPrefix = fixPrefix;

