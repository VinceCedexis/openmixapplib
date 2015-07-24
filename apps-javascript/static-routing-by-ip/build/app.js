var productionConfig = {
    providers: {
        'provider-a': {
            'cname': 'a.foo.com'
        },
        'provider-b': {
            'cname': 'b.foo.com'
        },
        'provider-c': {
            'cname': 'c.foo.com'
        },
        'provider-d': {
            'cname': 'd.foo.com'
        }
    },
    // Each address block listed here will be used to route requests to a
    // specific provider.  Addresses not falling into any of these blocks will
    // be routed to the default provider.
    // These are evaluated from top to bottom, so more specific blocks should
    // come before larger or overlapping blocks.
    addressBlocks: [
        [ '216.240.32.100/32', 'provider-d' ],
        [ '216.240.32.0/24', 'provider-b' ],
        [ '216.240.33.0/25', 'provider-a' ],
        [ '216.240.33.128/25', 'provider-c' ]
    ],
    defaultProvider: 'provider-a',
    responseTTL: 20
};

var handler = new OpenmixApplication(productionConfig);

/**
 * @param {!Configuration} config
 */
function init(config) {
    'use strict';
    handler.doInit(config);
}

/**
 * @param {!OpenmixRequest} request
 * @param {!OpenmixResponse} response
 */
function onRequest(request, response) {
    'use strict';
    handler.handleRequest(request, response);
}

/** @constructor */
function OpenmixApplication(settings) {
    /** @type {!Object.<string, Object.<string, string>>} */
    this.providers = settings.providers;

    /** @type {!Array} */
    this.addressBlocks = settings.addressBlocks;

    /** @type {string} */
    this.defaultProvider = settings.defaultProvider;

    /** @type {number} */
    this.responseTTL = settings.responseTTL;
}

/**
 * @param {!Configuration} config
 */
OpenmixApplication.prototype.doInit = function(config) {
    for (var i in this.providers) {
        if (this.providers.hasOwnProperty(i)) {
            config.requireProvider(i);
        }
    }
    this.parseAddressBlocks();
};

/**
 * @param {!OpenmixRequest} request
 * @param {!OpenmixResponse} response
 */
OpenmixApplication.prototype.handleRequest = function(request, response) {
    //debugger;
    var alias = this.defaultProvider;
    var reason = 'default';
    var l = this.addressBlocks.length;
    for (var i = 0; i < l; i++) {
        var currentBlock = this.addressBlocks[i];
        if (currentBlock[2].contains(request.ip_address)) {
            alias = currentBlock[1];
            reason = 'mapped';
            break;
        }
    }
    response.respond(alias, this.providers[alias].cname);
    response.setTTL(this.responseTTL);
    response.setReasonCode(reason);
};

OpenmixApplication.prototype.parseAddressBlocks = function() {
    for (var i = 0; i < this.addressBlocks.length; i++) {
        var temp = this.addressBlocks[i];
        temp.push(new Netmask(temp[0]));
    }
};
// Generated by CoffeeScript 1.9.3

/*
(The MIT License)

Copyright (c) 2011 Olivier Poitrey rs@dailymotion.com

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var Netmask, ip2long, long2ip;

long2ip = function(long) {
  var a, b, c, d;
  a = (long & (0xff << 24)) >>> 24;
  b = (long & (0xff << 16)) >>> 16;
  c = (long & (0xff << 8)) >>> 8;
  d = long & 0xff;
  return [a, b, c, d].join('.');
};

ip2long = function(ip) {
  var b, byte, i, j, len;
  b = (ip + '').split('.');
  if (b.length === 0 || b.length > 4) {
    throw new Error('Invalid IP');
  }
  for (i = j = 0, len = b.length; j < len; i = ++j) {
    byte = b[i];
    if (isNaN(parseInt(byte, 10))) {
      throw new Error("Invalid byte: " + byte);
    }
    if (byte < 0 || byte > 255) {
      throw new Error("Invalid byte: " + byte);
    }
  }
  return ((b[0] || 0) << 24 | (b[1] || 0) << 16 | (b[2] || 0) << 8 | (b[3] || 0)) >>> 0;
};

Netmask = (function() {
  function Netmask(net, mask) {
    var error, i, j, ref;
    if (typeof net !== 'string') {
      throw new Error("Missing `net' parameter");
    }
    if (!mask) {
      ref = net.split('/', 2), net = ref[0], mask = ref[1];
      if (!mask) {
        switch (net.split('.').length) {
          case 1:
            mask = 8;
            break;
          case 2:
            mask = 16;
            break;
          case 3:
            mask = 24;
            break;
          case 4:
            mask = 32;
        }
      }
    }
    if (typeof mask === 'string' && mask.indexOf('.') > -1) {
      try {
        this.maskLong = ip2long(mask);
      } catch (_error) {
        error = _error;
        throw new Error("Invalid mask: " + mask);
      }
      for (i = j = 32; j >= 0; i = --j) {
        if (this.maskLong === (0xffffffff << (32 - i)) >>> 0) {
          this.bitmask = i;
          break;
        }
      }
    } else if (mask) {
      this.bitmask = parseInt(mask, 10);
      this.maskLong = (0xffffffff << (32 - this.bitmask)) >>> 0;
    } else {
      throw new Error("Invalid mask: empty");
    }
    try {
      this.netLong = (ip2long(net) & this.maskLong) >>> 0;
    } catch (_error) {
      error = _error;
      throw new Error("Invalid net address: " + net);
    }
    if (!(this.bitmask <= 32)) {
      throw new Error("Invalid mask for ip4: " + mask);
    }
    this.size = Math.pow(2, 32 - this.bitmask);
    this.base = long2ip(this.netLong);
    this.mask = long2ip(this.maskLong);
    this.hostmask = long2ip(~this.maskLong);
    this.first = this.bitmask <= 30 ? long2ip(this.netLong + 1) : this.base;
    this.last = this.bitmask <= 30 ? long2ip(this.netLong + this.size - 2) : long2ip(this.netLong + this.size - 1);
    this.broadcast = this.bitmask <= 30 ? long2ip(this.netLong + this.size - 1) : void 0;
  }

  Netmask.prototype.contains = function(ip) {
    if (typeof ip === 'string' && (ip.indexOf('/') > 0 || ip.split('.').length !== 4)) {
      ip = new Netmask(ip);
    }
    if (ip instanceof Netmask) {
      return this.contains(ip.base) && this.contains(ip.broadcast || ip.last);
    } else {
      return (ip2long(ip) & this.maskLong) >>> 0 === (this.netLong & this.maskLong) >>> 0;
    }
  };

  Netmask.prototype.next = function(count) {
    if (count == null) {
      count = 1;
    }
    return new Netmask(long2ip(this.netLong + (this.size * count)), this.mask);
  };

  Netmask.prototype.forEach = function(fn) {
    var index, j, k, len, long, range, ref, ref1, results, results1;
    range = (function() {
      results = [];
      for (var j = ref = ip2long(this.first), ref1 = ip2long(this.last); ref <= ref1 ? j <= ref1 : j >= ref1; ref <= ref1 ? j++ : j--){ results.push(j); }
      return results;
    }).apply(this);
    results1 = [];
    for (index = k = 0, len = range.length; k < len; index = ++k) {
      long = range[index];
      results1.push(fn(long2ip(long), long, index));
    }
    return results1;
  };

  Netmask.prototype.toString = function() {
    return this.base + "/" + this.bitmask;
  };

  return Netmask;

})();
