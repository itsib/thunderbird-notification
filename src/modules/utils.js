var MenuAlignment = {
  Left: 1,
  Right: 0,
  Center: 0.5,
}

var StoreKey = {
  RefreshInterval: 'refresh-interval',
  ImapSettings: 'imap-accounts',
  LogLevel: 'log-level',
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

let filter = ['scale_factor', 'root', 'display', 'parent'];
let tabSize = 4;
let maxDepth = 2;
let tab = ' '.repeat(tabSize);
var show = (object, _maxDepth) => {
  maxDepth = _maxDepth ?? maxDepth;

  return `\n${renderValue(object)}`;
}

var objectName = object => {
  const stringify = `${object}`;
  const matched = stringify.match(/\[object\sinstance\swrapper\s([A-Za-z0-9.:_-]+)\s/);
  if (!matched) {
    return stringify;
  }
  return matched[1];
}

var renderValue = (object, indent = 0) => {
  switch (typeof object) {
    case 'bigint':
    case 'boolean':
    case 'number':
      return `${object}`;
    case 'string':
    case 'symbol':
      return `"${object}"`;
    case 'undefined':
      return `undefined`;
    case 'object': {
      if (object === null) {
        return `null`;
      }

      if (indent >= maxDepth) {
        return Array.isArray(object) ? `[ Array ]` : `<${objectName(object)}>`;
      }

      if (Array.isArray(object)) {
        const tabSpace = tab.repeat(indent + 1);
        const array = object.map(item => `${tabSpace}${item}\n`).join('');

        return `[\n${array}${tab.repeat(indent)}]`;
      }

      const keysValues = [];
      for (const property in object) {
        if (property.startsWith('_') || filter.includes(property)) {
          continue;
        }
        keysValues.push([property, renderValue(object[property], indent + 1)])
      }

      const tabSpace = tab.repeat(indent + 1);
      const child = keysValues
        .sort(([n0, v0], [n1, v1]) => {
          if (typeof v0 === 'object' && typeof v1 !== 'object') {
            return 1;
          }
          if (typeof v0 !== 'object' && typeof v1 === 'object') {
            return -1;
          }

          return n1 === n0 ? 0 : (n1 < n0 ? 1 : -1);
        })
        .map(([n, v]) => `${tabSpace}${n}: ${v}\n`).join('');

      let returns = `<${objectName(object)}> {`;
      returns += `\n${child}${tab.repeat(indent)}}`

      return returns;
    }
    case 'function': {
      const matched = object.toString().match(/method\s[\w._]+\.([a-z_]+)(\((?:[a-z,\s]+)?\))/);
      if (matched) {
        return `${matched[2]} => any`;
      }
      return `() => unknown`
    }
  }
}