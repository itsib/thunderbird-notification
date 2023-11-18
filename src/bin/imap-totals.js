#!/usr/bin/env node
const Imap = require('imap');

function getConfigFromArgs(_args) {
  const [_node, _file, ...args] = _args;

  const configs = [];

  while (args.length) {
    const flag = args.shift();

    switch (flag) {
      case '-h':
      case '--help':
        return help();
      case '-c':
      case '--conn':
        configs.push(deserialize(args.shift()));
        break;
      default:
        console.error(`Unknown parameter ${flag}`);
        process.exit(1);
    }
  }

  return configs;
}

function deserialize(serialized) {
  const keys = ['host', 'port', 'login', 'password', 'tls'];
  const values = serialized.trim().split('::');
  if (keys.length !== values.length) {
    console.error(`Unresolved config parameter ${serialized}`);
    process.exit(1);
  }

  const host = values[0].trim();
  return {
    host,
    port: Number(values[1]),
    user: values[2].trim(),
    password: values[3].trim(),
    tls: ['1', 'true', 'yes'].includes(values[4].trim()),
    tlsOptions: {
      servername: host
    },
  }
}

function help() {
const text = `Utility for getting the number of new emails via IMAP.
  -h, --help            Displays this help.
  -c, --conn <config>   Serialized connection config. 
                        Serialize format: 
                            host::port::login::password::tls
                        For example:
                           "imap.google.com::993::user@gmail.com::password:true"
`;
  console.log(text);

  process.exit();
}

/**
 * Connect co IMAP server
 * @param config
 * @return {Promise<Connection>}
 */
function connect(config) {
  return new Promise((resolve, reject) => {
    const connection = new Imap({ ...config });

    connection.once('error', (err) => {
      connection.destroy();
      return reject(err);
    })

    connection.once('ready', () => resolve(connection));

    connection.once('end', () => console.log('Connection ended'));

    connection.connect();
  })
}

function openBox(connection, name = 'INBOX') {
  return new Promise((resolve, reject) => {
    connection.openBox(name, true, (err, box) => {
      return err ? reject(err) : resolve(box);
    });
  });
}

function getUnseenCount(connection) {
  return new Promise((resolve, reject) => {
    connection.search(['UNSEEN'], (err, result) => {
      return err ? reject(err) : resolve(result.length);
    });
  });
}

/**
 * Fetch inbox status
 * @param config
 */
async function fetchInbox(config) {
  const connection = await connect(config);

  const box = await openBox(connection);

  const unseen = await getUnseenCount(connection);

  return {
    unseen,
    total: box?.messages?.total ?? 0,
  };
}

(async () => {
  const configs = getConfigFromArgs(process.argv);

  Promise.all(configs.map(config => fetchInbox(config).then(({ total, unseen }) => `${config.host} total ${total} unseen ${unseen}`)))
    .then(strings => {
      strings.forEach(string => console.log(string));
      process.exit();
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    })
})()