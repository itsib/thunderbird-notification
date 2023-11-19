var MenuAlignment = {
  Left: 1,
  Right: 0,
  Center: 0.5,
}

var ProcessFlags = {
  STDOUT_PIPE: 3,
  STDERR_PIPE: 5,
}

var StoreKey = {
  RefreshInterval: 'refresh-interval',
  ImapSettings: 'imap-accounts',
}

var IMAP_SETTING_FIELDS = ['id', 'host', 'port', 'login', 'password', 'tls'];

var SEP = '::';

/**
 *
 * @param object {{ [key: string]: string | number | boolean | null | undefined }} Object to serialize
 * @param keys {string[]} Ordered keys of object to serialize
 * @returns {string}
 */
var serialize = (object, keys = IMAP_SETTING_FIELDS) => {
  let serialized = '';

  const lastInx = keys.length - 1;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = object[key];
    const type = typeof value;
    const separator = lastInx === i ? '' : SEP;

    // b - bool
    // d - digit
    // n - null | undefined
    // s - string

    let stringValue;
    if (type === 'boolean') {
      stringValue = value ? 'b1' : 'b0';
    } else if (type === 'number') {
      stringValue = `d${value}`;
    } else if (value == null) {
      stringValue = 'n' // null
    } else {
      stringValue = `s${value}`;
    }

    serialized += `${stringValue}${separator}`;
  }

  return serialized;
};

var deserialize = (serialized, keys = IMAP_SETTING_FIELDS) => {
  const object = {};
  const segments = serialized.split(SEP);

  // b - bool
  // d - digit
  // n - null | undefined
  // s - string

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const segment = segments[i];
    const type = segment.substring(0, 1);
    const value = segment.substring(1);

    if (type === 'b') {
      object[key] = Boolean(+value);
    } else if (type === 'd') {
      object[key] = Number(value);
    } else if (type === 's') {
      object[key] = value;
    } else {
      object[key] = null;
    }
  }

  return object;
};