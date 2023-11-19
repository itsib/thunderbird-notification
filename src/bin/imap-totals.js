#!/usr/bin/env node
const Imap = require('./connection');

function getConfigFromArgs(_args) {
  const [_node, _file, ...args] = _args;

  let host;
  let port;
  let user;
  let password;
  let tls;

  while (args.length) {
    const flag = args.shift();

    switch (flag) {
      case '-h':
      case '--help':
        return help();
      case '--host':
        host = args.shift()
        break;
      case '-p':
      case '--port':
        port = Number(args.shift());
        break;
      case '-u':
      case '--user':
        user = args.shift();
        break;
      case '--password':
        password = args.shift()
        break;
      case '--tls':
        const t = args.shift();
        tls = t === 'true' || t === '1';
        break;
      default:
        console.error(`Unknown parameter ${flag}`);
        process.exit(1);
    }
  }
  port = port ?? 993;
  tls = tls ?? true;
  if (!host || !user || !password) {
    console.error(`Fields host, user and password is required `);
    process.exit(1);
  }

  return { host, port, user, password, tls, tlsOptions: { servername: host } };
}

function help() {
const text = `Utility for getting the number of new emails via IMAP.
  -h, --help            Displays this help.
      --host            IMAP server host.
  -p, --port <config>   Serialized connection config. 
  
  -u, --user            Credentials for IMAP inbox.
      --password     
      
      --tls                    
`;
  console.log(text);

  process.exit();
}

/**
 * Connect co IMAP server
 * @param config
 */
function connect(config) {
  return new Promise((resolve, reject) => {
    const connection = new Imap(config);

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
  const config = getConfigFromArgs(process.argv);

  fetchInbox(config)
    .then(({ total, unseen }) => `${config.host} total ${total} unseen ${unseen}`)
    .then(result => {
      console.log(result);
      process.exit();
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    })
})();