const geoip = require('geoip-lite');
module.exports = {
  ipLookup(ip) { return geoip.lookup(ip) || null; } // { country, region, city, ll:[lat,lng] }
};
