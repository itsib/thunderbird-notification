const { Adw, GObject, Gtk, Gio, GLib, Pango } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Modules = Me.imports.modules;

const _ = ExtensionUtils.gettext;

/** @type {Logger} */
let Logger = new Modules.logger.Logger(Me.metadata['gettext-domain']);
/** @type {Adw.PreferencesWindow} */
let Window;

/**
 * @param DUMP_IMAP_SERVER {Object}
 * @param DUMP_IMAP_SERVER.host {string}
 * @param DUMP_IMAP_SERVER.port {number}
 * @param DUMP_IMAP_SERVER.login {string}
 * @param DUMP_IMAP_SERVER.password {password}
 * @param DUMP_IMAP_SERVER.tls {boolean}
 */
const DUMP_IMAP_SERVER = { host: 'imap.', port: 993, login: '', password: '', tls: true };
const SETTINGS_IMAP_SERVERS = 'imap-accounts';
const SETTINGS_INTERVAL = 'refresh-interval';
const MAX_IMAP_ACCOUNTS = 10;

// ============================================================

class ImapServerManageDialog extends Gtk.Dialog {
    static {
        GObject.registerClass(this);
    }
    /**
     * ID of the record being edited. If not
     * defined, the record will be created
     * @type {number | undefined}
     */
    id;
    /**
     * Data model field states
     * @type {{}}
     */
    fields = {
        login: '',
        password: '',
        host: 'imap.',
        port: 993,
        tls: true,
    };

    constructor({ transient_for, id, fields }) {
        super({
            title: id !== undefined ? _('Edit IMAP server configuration') : _('Add new IMAP server configuration'),
            use_header_bar: true,
            transient_for,
            modal: true,
        });

        this.id = id;
        this.fields.login = fields?.login ?? this.fields.login;
        this.fields.password = fields?.password ?? this.fields.password;
        this.fields.host = fields?.host ?? this.fields.host;
        this.fields.port = fields?.port ?? this.fields.port;
        this.fields.tls = fields?.tls ?? this.fields.tls;

        const dialogUi = `${Me.path}/ui/imap-server-manage-dialog.glade`;
        const builder = new Gtk.Builder();
        builder.set_translation_domain(Me.metadata['gettext-domain']);
        builder.add_from_file(dialogUi);

        let dialogRootContainer = builder.get_object('imap-server-manage-dialog');

        this.get_content_area().append(dialogRootContainer);

        this.add_button(_('Ok'), Gtk.ResponseType.OK);
        this.add_button(_('Cancel'), Gtk.ResponseType.CANCEL);
        this.set_default_response(Gtk.ResponseType.OK);

        /** @type {Gtk.Entry} */
        const loginField = builder.get_object('login-field');
        /** @type {Gtk.Entry} */
        const passwordField = builder.get_object('password-field');
        /** @type {Gtk.Entry} */
        const hostField = builder.get_object('host-field');
        /** @type {Gtk.SpinButton} */
        const portField = builder.get_object('port-field');
        /** @type {Gtk.Switch} */
        const tlsSwitch = builder.get_object('tls-switch');

        loginField.set_text(this.fields.login);
        loginField.connect('changed', self => {
            this.fields.login = self.text;
        });

        passwordField.set_text(this.fields.password);
        passwordField.connect('changed', self => {
            this.fields.password = self.text;
        });

        hostField.set_text(this.fields.host ?? '');
        hostField.connect('changed', self => {
            this.fields.host = self.text;
        });

        portField.set_sensitive(true);
        portField.set_range(0, 65535);
        portField.set_increments(1, 2);
        portField.set_value(this.fields.port);
        portField.connect('value-changed', self => {
            this.fields.port = self.get_value_as_int();
        });

        tlsSwitch.set_state(!!this.fields.tls);
        tlsSwitch.connect('state-set', self => {
            this.fields.tls = !self.state;
        });
    }
}

class NewItem extends GObject.Object {
    static {
        GObject.registerClass(this);
    }
}

class NewItemModel extends GObject.Object {
    static [GObject.interfaces] = [Gio.ListModel];
    static {
        GObject.registerClass(this);
    }

    _item = new NewItem();

    vfunc_get_item_type() {
        return NewItem;
    }

    vfunc_get_n_items() {
        return 1;
    }

    vfunc_get_item(_pos) {
        return this._item;
    }
}

class ImapServer extends GObject.Object {
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
     * @param id {number}
     * @param config {Object}
     * @param config.host {string}
     * @param config.port {number}
     * @param config.login {string}
     * @param config.password {string}
     * @param config.tls {boolean}
     */
    constructor(id, config) {
        super({ ...config, id });
    }

    /**
     * Returns serialized config
     */
    serialize() {
        let serialized = '';
        serialized += `${this.id}:`;
        serialized += `${this.host}:`;
        serialized += `${this.port}:`;
        serialized += `${this.login}:`;
        serialized += `${this.password}:`;
        serialized += `${Number(this.tls)}`;

        return serialized;
    }

    /**
     * Return simle JS object
     */
    toObject() {
        return {
            id: this.id,
            host: this.host,
            port: this.port,
            login: this.login,
            password: this.password,
            tls: this.tls,
        }
    }
}

class ImapServersList extends GObject.Object {
    static [GObject.interfaces] = [Gio.ListModel];
    static {
        GObject.registerClass(this);
    }

    /**
     * @type {Gio.Settings}
     * @private
     */
    _settings;
    /**
     *
     * @type {ImapServer[]}
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
        this._changedId = this._settings.connect(`changed::${SETTINGS_IMAP_SERVERS}`, () => this._sync());

        this._sync();
    }

    lastId() {
        return this._imapServers.sort((a, b) => b.id - a.id)[0]?.id;
    }

    /**
     * Add new IMAP configuration
     * @param fields {Object}
     */
    create(fields) {
        const index = this._imapServers.length;
        const id = this.lastId() + 1;

        Logger.debug(`Add new IMAP server ${JSON.stringify(fields)}`);


        this._imapServers.push(new ImapServer(id, fields));
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

        this._imapServers[index].set({...fields}, null);
        this._saveImapServers();
    }

    _saveImapServers() {
        this._settings.block_signal_handler(this._changedId);

        this._settings.set_strv(SETTINGS_IMAP_SERVERS, this._imapServers.map(r => r.serialize()));

        this._settings.unblock_signal_handler(this._changedId);
    }

    _sync() {
        const removed = this._imapServers.length;

        /** @type {ImapServer[]} */
        const imapServers = [];

        for (const serializedImapServer of this._settings.get_strv(SETTINGS_IMAP_SERVERS)) {
            const [id, host, port, login, password, tls] = serializedImapServer.split(':');

            const imapServer = new ImapServer(+id, {
                host,
                port: +port,
                login,
                password,
                tls: tls ? Boolean(+tls) : false,
            });

            imapServers.push(imapServer);
        }

        this._imapServers = imapServers.sort((a, b) => a.id - b.id);

        this.items_changed(0, removed, this._imapServers.length);
    }

    vfunc_get_item_type() {
        return ImapServer;
    }

    vfunc_get_n_items() {
        return this._imapServers.length;
    }

    /**
     *
     * @param index {number}
     * @returns {ImapServer|null}
     */
    vfunc_get_item(index) {
        return this._imapServers[index] ?? null;
    }
}

class ImapServerEditRow extends Adw.PreferencesRow {
    static {
        GObject.registerClass({ GTypeName: 'ImapServerEditRow' }, this);
    }

    /** @type {ImapServer} */
    _imapServer;

    constructor(imapServer) {
        super();

        this._imapServer = imapServer;

        /** @type {Gtk.Box} */
        const child = new Gtk.Box({
            spacing: 10,
            margin_top: 6,
            margin_bottom: 6,
            margin_start: 12,
            margin_end: 6,
        });

        const label = new Gtk.Label({
            hexpand: true,
            xalign: 0,
            max_width_chars: 25,
            ellipsize: Pango.EllipsizeMode.END,
            label: `IMAP: ${imapServer.host} ${imapServer.port}`,
        });

        const buttonRemove = new Gtk.Button({ action_name: 'imap-server.remove', icon_name: 'edit-delete-symbolic', has_frame: false });
        buttonRemove.connect('clicked', self => {
            Logger.info(`Btn remove`)
        })

        const buttonEdit = new Gtk.Button({ action_name: 'imap-server.edit', icon_name: 'edit-symbolic', has_frame: false });
        buttonRemove.connect('clicked', self => {
            Logger.info(`Btn edit`)
        })

        child.append(label);
        child.append(buttonRemove);
        child.append(buttonEdit);

        this.child = child;
    }
}

class ImapServerAddRow extends Adw.PreferencesRow {
    static {
        GObject.registerClass(this);
    }

    constructor() {
        super({
            action_name: 'imap-server.add',
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

class ImapServersPreferencesGroup extends Adw.PreferencesGroup {
    static {
        GObject.registerClass(this);

        this.install_action('imap-server.add', null, self => self._openCreateImapServerDialog());
        this.install_action('imap-server.remove', 's', (self, name, param) => self._openRemoveImapAccountDialog(param.unpack()));
        this.install_action('imap-server.patch', '(si)', (self, name, param) => self._openEditImapAccountDialog(...param.deepUnpack()));
    }

    /** @type {Gio.Settings} */
    _settings;
    /** @type {ImapServersList} */
    _imapServersList;

    constructor() {
        super({
            title: _('IMAP Servers'),
            description: _('Configuration for incoming email server IMAP.'),
        });

        /**@type {Gio.Settings} */
        this._settings = ExtensionUtils.getSettings();

        this._imapServersList = new ImapServersList();

        const store = new Gio.ListStore({ item_type: Gio.ListModel });
        const listModel = new Gtk.FlattenListModel({ model: store });
        store.append(this._imapServersList);
        store.append(new NewItemModel());


        this._list = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.NONE,
            css_classes: ['boxed-list'],
        });
        this.add(this._list);

        this._list.bind_model(listModel, item => {
            return item instanceof NewItem
                ? new ImapServerAddRow()
                : new ImapServerEditRow(item);
        });
    }

    /**
     * Opens dialog to confirm delete IMAP account config
     * @param id {number}
     * @private
     */
    _openRemoveImapAccountDialog(id) {
        Logger.debug(`Remove IMAP account. Open dialog. ${id}`);
    }

    /**
     * Opens the edit IMAP account dialog
     * @param id {number}
     * @param params
     * @private
     */
    _openEditImapAccountDialog(id, params) {
        Logger.debug(`Edit IMAP account. Open dialog ${id}`);
    }

    /**
     * Open dialog modal with IMAP server config form
     * @private
     */
    _openCreateImapServerDialog() {
        const imapServersList = this._imapServersList;
        const dialog = new ImapServerManageDialog({ transient_for: this.get_root() });

        dialog.connect('response', (dialog, response) => {
            if (response === Gtk.ResponseType.OK) {
                if (dialog.id) {
                    imapServersList.patch(dialog.id, dialog.fields);
                } else {
                    imapServersList.create(dialog.fields);
                }

                Logger.info(`Dialog response ${JSON.stringify(dialog.fields)}`);
            }
            dialog.destroy();
        });

        dialog.show();
    }
}

// ======== Refresh interval ========================================

class CommonPreferencesGroup extends Adw.PreferencesGroup {
    static {
        GObject.registerClass(this);
    }

    _init(config) {
        super._init({
            ...(config ?? {}),
            name: Me.metadata.name,
            title: _('Appearance'),
            description: _(`Configure the appearance of ${Me.metadata.name}`),
        });

        /**@type {Gio.Settings} */
        const settings = ExtensionUtils.getSettings();

        const actionRow = new Adw.ActionRow({
            title: _('Refresh time (seconds)'),
            subtitle: _('After what period of time will emails be updated over the IMAP protocol.'),
        });

        let spinButton = new Gtk.SpinButton({
            value: settings.get_int(SETTINGS_INTERVAL),
            valign: Gtk.Align.CENTER,
        });
        spinButton.set_sensitive(true);
        spinButton.set_range(30, 240);
        spinButton.set_increments(5, 2);
        spinButton.set_value(settings.get_int(SETTINGS_INTERVAL));
        spinButton.connect('value-changed', btn => {
            const amount = btn.get_value_as_int();

            Logger.debug(`Update ${SETTINGS_INTERVAL}: ${amount}`);

            settings.set_int(SETTINGS_INTERVAL, amount);
        });

        actionRow.add_suffix(spinButton);
        actionRow.activatable_widget = spinButton;

        this.add(actionRow);
    }
}

// ========= Container Box ==================================

class PreferencesWidget extends Gtk.Box {
    static {
        GObject.registerClass(this);
    }

    _init() {
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 20,
        });

        this.append(new CommonPreferencesGroup());
        this.append(new ImapServersPreferencesGroup());
    }
}

/**
 * Like `extension.js` this is used for any one-time setup like translations.
 *
 * @param meta {ExtensionMetadata} The metadata.json file, parsed as JSON
 */
function init(meta) {
    ExtensionUtils.initTranslations(meta['gettext-domain']);
}

/**
 * This function is called when the preferences window is first created to build
 * and return a GTK4 widget.
 *
 * The preferences window will be a `Adw.PreferencesWindow`, and the widget
 * returned by this function will be added to an `Adw.PreferencesPage` or
 * `Adw.PreferencesGroup` if necessary.
 *
 * @returns {Gtk.Widget} the preferences widget
 */
function buildPrefsWidget() {
    return new PreferencesWidget();
}