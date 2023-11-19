const { GObject, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { Logger } = Me.imports.modules.logger;

const _ = ExtensionUtils.gettext;

var ImapConfigFormDialog = class ImapConfigForm extends Gtk.Dialog {
  static [GObject.properties] = {
    id: GObject.ParamSpec.int('id', 'id', 'id', GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT, -1, 65535, -1),
    host: GObject.ParamSpec.string('host', 'host', 'host', GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT, 'imap.'),
    port: GObject.ParamSpec.uint('port', 'port', 'port', GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT, 0, 65535, 993),
    login: GObject.ParamSpec.string('login', 'login', 'login', GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT, ''),
    password: GObject.ParamSpec.string('password', 'password', 'password', GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT, ''),
    tls: GObject.ParamSpec.boolean('tls', 'tls', 'tls', GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT, true),
  };

  static [GObject.signals] = {
    'form-submit': {
      param_types: [ImapConfigForm],
    },
  };

  static { GObject.registerClass(this) }

  constructor({ transient_for, values }) {
    const isAdd = !values;
    const title = isAdd ? _('Add new IMAP server configuration') : _('Edit IMAP server configuration');
    super({ title, use_header_bar: true, transient_for, modal: true, decorated: true});

    Logger.debug('Open IMAP manage dialog');

    this.id = values?.id ?? -1;
    if (values) {
      this.host = values.host;
      this.port = values.port;
      this.login = values.login;
      this.password = values.password;
      this.tls = values.tls;
    }

    const builder = new Gtk.Builder();
    builder.set_translation_domain(Me.metadata['gettext-domain']);
    builder.add_from_file(`${Me.path}/prefs-ui/imap-config-form-dialog.ui`);

    /** @type {Gtk.Widget} */
    const imapConfigForm = builder.get_object('imapConfigForm');

    /** @type {Gtk.Entry} */
    const loginField = builder.get_object('loginField');
    /** @type {Gtk.Entry} */
    const passwordField = builder.get_object('passwordField');
    /** @type {Gtk.Entry} */
    const hostField = builder.get_object('hostField');
    /** @type {Gtk.SpinButton} */
    const portField = builder.get_object('portField');
    /** @type {Gtk.Switch} */
    const tlsSwitch = builder.get_object('tlsSwitch');

    this.bind_property('login', loginField, 'text', GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.BIDIRECTIONAL);
    this.bind_property('password', passwordField, 'text', GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.BIDIRECTIONAL);
    this.bind_property('host', hostField, 'text', GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.BIDIRECTIONAL);
    this.bind_property('tls', tlsSwitch, 'active', GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.BIDIRECTIONAL);

    portField.set_sensitive(true);
    portField.set_range(0, 65535);
    portField.set_increments(1, 2);
    portField.set_value(this.port);
    portField.connect('value-changed', self => {
      this.port = self.get_value_as_int();
    });

    this.get_content_area().append(imapConfigForm);
    this.add_button(_('Cancel'), Gtk.ResponseType.CANCEL);
    this.add_button(isAdd ? _('Add') : _('Apply'), Gtk.ResponseType.APPLY);
  }

  /**
   * Returns values as simple object
   * @returns {{password: string, port: number, host: string, tls: boolean, login: string}}
   */
  values() {
    return {
      id: this.id,
      login: this.login,
      password: this.password,
      host: this.host,
      port: this.port,
      tls: this.tls,
    };
  }
};
