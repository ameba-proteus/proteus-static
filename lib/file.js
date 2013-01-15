
/**
 * static file reader
 * which caches contents on memory.
 */

var cache = {};
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');

function Item(option) {
	EventEmitter.call(this);
	this.path = option.path;
	this.convert = option.convert;
	this.encode = option.encode;
	this.logger = option.logger;
	this.headers=  option.headers;
}
Item.prototype = new EventEmitter();
Item.prototype.get = function(callback) {
	var self = this;
	fs.stat(self.path, function(err, stats) {
		if (err) {
			if (err.code === 'ENOENT') {
				this.error = err;
				callback(null,self);
				return;
			}
			return callback(err);
		}
		cache[self.path] = self;
		if (self.stats) {
			// compare date
			var mtimeNew = stats.mtime;
			var mtimeOld = self.stats.mtime;
			// if file is updated reload the data
			if (mtimeNew.getTime() === mtimeOld.getTime()) {
				callback(null,self);
				return;
			}
		}
		// load file from filesytem
		fs.readFile(self.path, self.encode, function(err, data) {
			self.convert(data, function(err, data) {
				if (err) {
					callback(err);
				} else {
					self.stats = stats;
					self.data = data;
					self.size = Buffer.byteLength(data, self.encode);
					self.modified = self.stats.mtime.toGMTString();
					self.etag = self.size + '-' + self.stats.mtime.getTime();
					callback(null,self);
				}
			});
		});
	});
};
Item.prototype.send = function(req, res) {
	var self = this;
	var headers = self.headers;

	if (!self.stats) {
		res.send(404);
		return;
	}

	var mtime = self.stats.mtime;
	var since = req.header('if-modified-since');

	var fresh = false;
	// check modified time
	if (since) {
		var sinceDate = new Date(since);
		fresh = (sinceDate.getTime() === mtime.getTime());
	}
	var etag = false;
	// check also etag even if modified time is old
	var none = req.header('if-none-match');
	if (none) {
		etag = none === self.etag;
	}
	// return 304 not modified if file is fresh and etag matched
	if (fresh && etag) {
		res.send(304);
		res.end();
		return;
	}
	for (var name in headers) {
		res.set(name, headers[name]);
	}
	res.set('Content-Length', self.size);
	res.set('Last-Modified', self.modified);
	res.set('ETag', self.etag);
	res.end(self.data);
};

function Items(option) {
	option = option || {};
	this.convert = option.convert || function (data) { return data; };
	this.encode = option.encode || 'utf8';
	this.path = option.path;
	this.logger = option.logger;
	this.logger.debug('creating file items', {path:this.path, encode:this.encode});
	this.headers = option.headers || {};
}
Items.prototype.get = function(filename, cb) {
	var filepath = path.join(this.path, filename);
	var item = cache[filepath];
	if (!item) {
		item = new Item({
			path: filepath,
			convert: this.convert,
			encode: this.encode,
			headers: this.headers
		});
	}
	item.get(cb);
};

module.exports = Items;

