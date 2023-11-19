const { Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { deserialize } = Me.imports.modules.utils;
const { Logger } = Me.imports.modules.logger;

/**
 *
 * @param output {string}
 */
var parseOutput = output => {
  const result = output.match(/total\s(\d+)\sunseen\s(\d+)/);
  if (!result) {
    return { total: 0, unread: 0 };
  }
  return {
    total: Number(result[1]),
    unread: Number(result[2]),
  };
}

/**
 * Get unread messages
 * @param serialized {string}
 * @return {Promise<number>}
 */
var messages = serialized => {
  const config = deserialize(serialized);

  return new Promise(resolve => {
    try {
      const node = '/home/sergey/.nvm/versions/node/v18.18.2/bin/node';
      const script = `${Me.path}/bin/imap-totals.js`;
      const params = [
        `--host`, config.host,
        '--port', config.port.toString(),
        '--user', config.login,
        '--password', config.password,
        '--tls', `${config.tls}`,
      ];

      const commands = [node, script].concat(params);

      const proc = Gio.Subprocess.new(commands, Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);

      proc.communicate_utf8_async(null, null, (_, result) => {
          try {
            let [, stdout, stderr] = proc.communicate_utf8_finish(result);
            if (proc.get_successful()) {
              const totals = parseOutput(stdout.trim());

              return resolve(totals.unread);
            }
            return resolve(0);
          } catch (e) {
            Logger.error(`ERROR_1: ${e.message} ${e?.toString()}`);
            return resolve(0);
          }
      });
    } catch (e) {
      Logger.error(`ERROR_2: ${e.message} ${e?.stackTrace}`);
      return resolve(0);
    }
  });
}