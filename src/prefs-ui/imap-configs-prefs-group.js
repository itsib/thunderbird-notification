const { Adw, GObject, Gtk, Gio, GLib, Pango } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
/** @type {ImapConfigFormDialog} */
const { ImapConfigFormDialog } = Me.imports['prefs-ui']['imap-config-form-dialog'];
const { Logger } = Me.imports.modules.logger;
const { serialize, deserialize, StoreKey } = Me.imports.modules.utils;

const _ = ExtensionUtils.gettext;

class DumpItem extends GObject.Object {
  static {
    GObject.registerClass(this);
  }
}

class DumpItemModel extends GObject.Object {
  static [GObject.interfaces] = [Gio.ListModel];
  static {
    GObject.registerClass(this);
  }

  _item = new DumpItem();

  vfunc_get_item_type() {
    return DumpItem;
  }

  vfunc_get_n_items() {
    return 1;
  }

  vfunc_get_item(_pos) {
    return this._item;
  }
}

class ImapConfigModel extends GObject.Object {
  static [GObject.properties] = {
    'id': GObject.ParamSpec.uint('id', 'ID', 'ID', GObject.ParamFlags.READWRITE, 0, 1e6, 0),
    'host': GObject.ParamSpec.string('host', 'Host', 'Host', GObject.ParamFlags.READWRITE, 'imap.'),
    'port': GObject.ParamSpec.uint('port', 'Port', 'Port', GObject.ParamFlags.READWRITE, 0, 65535, 993),
    'login': GObject.ParamSpec.string('login', 'Login', 'Login', GObject.ParamFlags.READWRITE, ''),
    'password': GObject.ParamSpec.string('password', 'Password', 'Password', GObject.ParamFlags.READWRITE, ''),
    'tls': GObject.ParamSpec.boolean('tls', 'TLS', 'TLS', GObject.ParamFlags.READWRITE, true),
  };

  static {
    GObject.registerClass(this);
  }

  /**
   * Add new IMAP configuration
   * @param config {Object}
   * @param config.id {number}
   * @param config.host {string}
   * @param config.port {number}
   * @param config.login {string}
   * @param config.password {string}
   * @param config.tls {boolean}
   */
  constructor(config) {
    super(config);
  }

  /**
   * Returns serialized config
   */
  serialize() {
    return serialize(this);
  }

  /**
   * Update fields
   * @param values {{ [prop: string]: string | number | boolean }}
   */
  update(values) {
    for (const prop in values) {
      if (prop in this) {
        this.set_property(prop, values[prop]);
      }
    }
  }
}

class ImapConfigRow extends Adw.PreferencesRow {
  static { GObject.registerClass(this) }

  /** @type {ImapConfigModel & { id: number; login: string; password: string; host: string; port: string; tls: boolean }} */
  _imapServer;
  /** @type {Gtk.Label} */
  _label;

  constructor(imapServer) {
    super();

    this._imapServer = imapServer;

    /**
     * ImapConfigRow type definition
     * @typedef {Object} ImapServerEditRow
     * @property {Gtk.Box} child
     */
    this.child = new Gtk.Box({
      spacing: 10,
      margin_top: 6,
      margin_bottom: 6,
      margin_start: 12,
      margin_end: 6,
    });

    this._label = new Gtk.Label({
      hexpand: true,
      xalign: 0,
      max_width_chars: 25,
      wrap_mode: Pango.WrapMode.WORD,
      ellipsize: Pango.EllipsizeMode.END,
      label: this._getLabelText(),
    });

    const buttonRemove = new Gtk.Button({ icon_name: 'edit-delete-symbolic' }); // { action_name: 'imap-config.remove', has_frame: false  }
    buttonRemove.connect('clicked', this._remove.bind(this));

    const buttonEdit = new Gtk.Button({ icon_name: 'edit-symbolic' }); // { action_name: 'imap-config.edit', has_frame: false }
    buttonEdit.connect('clicked', this._edit.bind(this));

    this.child.append(this._label);
    this.child.append(buttonRemove);
    this.child.append(buttonEdit);

    this._imapServer.connect('notify::host', this._updateLabel.bind(this));
    this._imapServer.connect('notify::port', this._updateLabel.bind(this));
  }

  _updateLabel() {
    this._label.set_label(this._getLabelText());
  }

  _getLabelText() {
    return `${this._imapServer.host}:${this._imapServer.port}`;
  }

  _remove() {
    Logger.info(`Emit remove ${this._imapServer.id}`);

    const args = new GLib.Variant('i', [`${this._imapServer.id}`]);

    this.child.activate_action('imap-config.remove', args);
  }

  _edit() {
    const serialized = this._imapServer.serialize();

    Logger.info(`Emit edit ${serialized}`);

    this.child.activate_action('imap-config.patch', new GLib.Variant('s', serialized));
  }
}

class AddButtonRow extends Adw.PreferencesRow {
  static { GObject.registerClass(this) }

  constructor() {
    super({
      action_name: 'imap-config.add',
      child: new Gtk.Image({
        icon_name: 'list-add-symbolic',
        pixel_size: 16,
        margin_top: 12,
        margin_bottom: 12,
        margin_start: 12,
        margin_end: 12,
      }),
    });
    this.update_property([Gtk.AccessibleProperty.LABEL], [_('Add IMAP Server')]);
  }
}

class ImapConfigsList extends GObject.Object {
  static [GObject.interfaces] = [Gio.ListModel];
  static { GObject.registerClass(this) }

  /**
   * @type {Gio.Settings}
   * @private
   */
  _settings;
  /**
   *
   * @type {ImapConfigModel[]}
   * @private
   */
  _imapServers = [];
  /**
   * @type {number}
   * @private
   */
  _changedId;

  /**
   * Construct
   */
  constructor() {
    super();

    /**@type {Gio.Settings} */
    this._settings = ExtensionUtils.getSettings();
    this._changedId = this._settings.connect(`changed::${StoreKey.ImapSettings}`, () => this._sync());

    this._sync();
  }

  nextId() {
    const lastId = this._imapServers.sort((a, b) => b.id - a.id)[0]?.id ?? -1;
    return lastId + 1;
  }

  /**
   * Add new IMAP configuration
   * @param fields {Object}
   */
  create(fields) {
    const index = this._imapServers.length;

    this._imapServers.push(new ImapConfigModel({...fields, id: this.nextId()}));
    this._saveImapServers();

    this.items_changed(index, 0, 1);
  }

  /**
   * Remove IMAP account
   * @param id {number}
   */
  remove(id) {
    const index = this._imapServers.findIndex(r => r.id === id);
    if (index < 0)
      return;

    this._imapServers.splice(index, 1);
    this._saveImapServers();

    this.items_changed(index, 1, 0);
  }

  /**
   * Update IMAP account configuration
   * @param id {number}
   * @param fields {Object}
   */
  patch(id, fields) {
    const index = this._imapServers.findIndex(r => r.id === id);
    if (index < 0)
      return;

    this._imapServers[index].update({...fields});
    this._saveImapServers();
  }

  /**
   * Returns model by id
   * @param id
   * @return {ImapConfigModel}
   */
  getById(id) {
    return this._imapServers.find(r => r.id === id)
  }

  _saveImapServers() {
    this._settings.block_signal_handler(this._changedId);

    this._settings.set_strv(StoreKey.ImapSettings, this._imapServers.map(r => r.serialize()));

    this._settings.unblock_signal_handler(this._changedId);
  }

  _sync() {
    const removed = this._imapServers.length;

    this._imapServers = [];

    for (const serialized of this._settings.get_strv(StoreKey.ImapSettings)) {
      this._imapServers.push(new ImapConfigModel(deserialize(serialized)));
    }

    Logger.debug(`Current IMAP config state: ${JSON.stringify(this._imapServers)}`);

    this.items_changed(0, removed, this._imapServers.length);
  }

  vfunc_get_item_type() {
    return ImapConfigModel;
  }

  vfunc_get_n_items() {
    return this._imapServers.length;
  }

  /**
   *
   * @param index {number}
   * @returns {ImapConfigModel|null}
   */
  vfunc_get_item(index) {
    return this._imapServers[index] ?? null;
  }
}

var ImapConfigsPrefsGroup = class ImapConfigsPrefsGroup extends Adw.PreferencesGroup {
  static {
    GObject.registerClass(this);

    this.install_action('imap-config.add', null, self => self._openCreateImapConfigDialog());
    this.install_action('imap-config.remove', 'i', (self, name, param) => self._openRemoveImapConfigDialog(param.unpack()));
    this.install_action('imap-config.patch', 's', (self, name, param) => self._openEditImapConfigDialog(param.unpack()));
  }

  /** @type {Gio.Settings} */
  _settings;
  /** @type {ImapConfigsList} */
  _imapConfigsListWidget;

  constructor() {
    super({
      title: _('IMAP Servers'),
      description: _('Configuration for incoming email server IMAP.'),
    });

    /**@type {Gio.Settings} */
    this._settings = ExtensionUtils.getSettings();

    this._imapConfigsListWidget = new ImapConfigsList();

    const store = new Gio.ListStore({ item_type: Gio.ListModel });
    const listModel = new Gtk.FlattenListModel({ model: store });
    store.append(this._imapConfigsListWidget);
    store.append(new DumpItemModel());


    this._listBox = new Gtk.ListBox({
      selection_mode: Gtk.SelectionMode.NONE,
      css_classes: ['boxed-list'],
    });
    this.add(this._listBox);

    this._listBox.bind_model(listModel, item => {
      return item instanceof DumpItem
        ? new AddButtonRow()
        : new ImapConfigRow(item);
    });
  }

  /**
   * Opens dialog to confirm delete IMAP account config
   * @param id {number}
   * @private
   */
  _openRemoveImapConfigDialog(id) {
    Logger.debug(`Remove IMAP account. Open dialog.${id}`);

    const imapConfig = this._imapConfigsListWidget.getById(id);

    const dialog = new Gtk.MessageDialog({
      transient_for: this.get_root(),
      modal: true,
      buttons: Gtk.ButtonsType.YES_NO,
      message_type: Gtk.MessageType.WARNING,
      width_request: 400,
      halign: Gtk.Align.CENTER,
      text: imapConfig.host,
      secondary_text: _('The IMAP server configuration will be deleted now. Do you confirm the deletion?'),
    });

    dialog.connect('response', (self, response) => {
      Logger.debug(`Remove dialog response. ${response} ${Gtk.ResponseType.YES}`);

      if (response === Gtk.ResponseType.YES) {
        this._imapConfigsListWidget.remove(id)
      }
      dialog.destroy();

    })

    dialog.show();
  }

  /**
   * Opens the edit IMAP account dialog
   * @param serialized {string}
   * @private
   */
  _openEditImapConfigDialog(serialized) {
    const values = deserialize(serialized);

    Logger.info(`Edit deserialized ${JSON.stringify(values)}`)

    const dialog = new ImapConfigFormDialog({ transient_for: this.get_root(), values });

    dialog.connect('response', (dialog, response) => {
      if (response === Gtk.ResponseType.APPLY) {
        this._handleFormResponse(dialog.values());
      }

      dialog.destroy();
    });

    dialog.show();
  }

  /**
   * Open dialog modal with IMAP server config form
   * @private
   */
  _openCreateImapConfigDialog() {
    const dialog = new ImapConfigFormDialog({ transient_for: this.get_root() });

    dialog.connect('response', (self, response) => {
      if (response === Gtk.ResponseType.APPLY) {
        this._handleFormResponse(dialog.values());
      }

      dialog.destroy();
    });

    dialog.show();
  }

  /**
   * Handle edit and create response
   * @param values {{
   *      id: number;
   *      login: string;
   *      password: string;
   *      host: string;
   *      port: number;
   *      tls: boolean;
   *  }}
   * @private
   */
  _handleFormResponse(values) {
    Logger.debug(`Handle: ${JSON.stringify(values)}`);

    const { id, ...fields } = values;

    if (id === -1) {
      Logger.info(`Create: ${JSON.stringify(values)}`);

      this._imapConfigsListWidget.create(fields);
    } else {
      Logger.info(`Edit: ${JSON.stringify(values)}`);
      this._imapConfigsListWidget.patch(id, fields);
    }
  }
}