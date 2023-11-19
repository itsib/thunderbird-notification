var Buffer = require('buffer').Buffer;

function allocateAsciiBuffer(length) {
  return Buffer.alloc(length, 'ascii');
}

function encode(str) {
  var b = allocateAsciiBuffer(str.length * 2);
  for (var i = 0, bi = 0; i < str.length; i++) {
    // Note that we can't simply convert a UTF-8 string to Base64 because
    // UTF-8 uses a different encoding. In modified UTF-7, all characters
    // are represented by their two byte Unicode ID.
    var c = str.charCodeAt(i);
    // Upper 8 bits shifted into lower 8 bits so that they fit into 1 byte.
    b[bi++] = c >> 8;
    // Lower 8 bits. Cut off the upper 8 bits so that they fit into 1 byte.
    b[bi++] = c & 0xFF;
  }
  // Modified Base64 uses , instead of / and omits trailing =.
  return b.toString('base64').replace(/=+$/, '');
}

function allocateBase64Buffer(str) {
  return Buffer.from(str, 'base64');
}

function decode(str) {
  var b = allocateBase64Buffer(str);
  var r = [];
  for (var i = 0; i < b.length;) {
    // Calculate charcode from two adjacent bytes.
    r.push(String.fromCharCode(b[i++] << 8 | b[i++]));
  }
  return r.join('');
}

// RFC 3501, section 5.1.3 UTF-7 encoding.
exports.encode = str => {
  // All printable ASCII chars except for & must be represented by themselves.
  // We replace subsequent non-representable chars with their escape sequence.
  return str.replace(/&/g, '&-').replace(/[^\x20-\x7e]+/g, function(chunk) {
    // & is represented by an empty sequence &-, otherwise call encode().
    chunk = (chunk === '&' ? '' : encode(chunk)).replace(/\//g, ',');
    return '&' + chunk + '-';
  });
};

// RFC 3501, section 5.1.3 UTF-7 decoding.
exports.decode = str => {
  return str.replace(/&([^-]*)-/g, function(_, chunk) {
    // &- represents &.
    if (chunk === '') return '&';
    return decode(chunk.replace(/,/g, '/'));
  });
};