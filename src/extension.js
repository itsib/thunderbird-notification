const { GObject, St, Gio, Atk, GLib } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Me = ExtensionUtils.getCurrentExtension();
const Modules = Me.imports.modules;
const { MenuAlignment, deserialize } = Modules.utils;
const { TrayIconWidget } = Me.imports.widgets['tray-icon-widget'];

const _ = ExtensionUtils.gettext;

const ProcessFlags = {
  STDOUT_PIPE: 3,
  STDERR_PIPE: 5,
}

/** @type {Logger} */
let Logger =  new Modules.logger.Logger(Me.metadata['gettext-domain']);
/**
 * @type {TrayIconWidget}
 */
let TrayIconInstance;

function getMessagesCount(config, callback) {
  try {
    const commands = ['/home/sergey/.nvm/versions/node/v18.18.2/bin/node',  `${Me.path}/bin/imap-totals.js`];

    config.forEach(config => {
      commands.push('-c');
      commands.push(config);
    });

    Logger.debug(`Commands ${commands.join(' ')}`);

    const proc = Gio.Subprocess.new(commands, ProcessFlags.STDOUT_PIPE | ProcessFlags.STDERR_PIPE)

    proc.communicate_utf8_async(null, null, (proc, res) => {
      try {
        const [, stdout, stderr] = proc.communicate_utf8_finish(res);
        if (proc.get_successful()) {
          callback?.(stdout);
        }
      } catch (e) {
        Logger.error(e.message, e?.stackTrace);
      }
    });
  } catch (e) {
    Logger.error(e.message, e?.stackTrace);
  }
}

/**
 * Dropdown menu integrated in tray icon.
 * @link https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/panel.js
 *
 * @type {{new(): AppMenuButton, style_class: string, name: string, $gtype: GObject.GType<Atk.ImplementorIface>, new(config?: Atk.ImplementorIface.ConstructorProperties): AppMenuButton, new(config?: Clutter.Animatable.ConstructorProperties): AppMenuButton, new(config?: Animatable.ConstructorProperties): AppMenuButton, new(config?: Clutter.Container.ConstructorProperties): AppMenuButton, class_find_child_property: {(klass: ObjectClass, property_name: (string | null)): ParamSpec, (klass: ObjectClass, property_name: (string | null)): ParamSpec}, class_list_child_properties: {(klass: ObjectClass): ParamSpec[], (klass: ObjectClass): ParamSpec[]}, new(config?: Container.ConstructorProperties): AppMenuButton, new(config?: Clutter.Scriptable.ConstructorProperties): AppMenuButton, new(config?: Scriptable.ConstructorProperties): AppMenuButton, new(config?: St.Button.ConstructorProperties): AppMenuButton, new(): AppMenuButton, new: {(): St.Button, (): St.Bin, (): Clutter.Actor, (): St.Bin, (): Clutter.Actor, (): Clutter.Actor, (): Actor, (): Gtk.Button}, new_with_label: {(text: (string | null)): St.Button, (label: (string | null)): Gtk.Button}, new(config?: St.Bin.ConstructorProperties): AppMenuButton, new(): AppMenuButton, new(config?: St.Widget.ConstructorProperties): AppMenuButton, new(config?: Clutter.Actor.ConstructorProperties): AppMenuButton, new(): AppMenuButton, new(config?: InitiallyUnowned.ConstructorProperties): AppMenuButton, new(config?: GObject.InitiallyUnowned.ConstructorProperties): AppMenuButton, new(config?: Actor.ConstructorProperties): AppMenuButton, new(): AppMenuButton, new(config?: Gtk.Button.ConstructorProperties): AppMenuButton, new(): AppMenuButton, new_from_icon_name(icon_name: (string | null)): Gtk.Button, new_with_mnemonic(label: (string | null)): Gtk.Button, new(config?: Gtk.Accessible.ConstructorProperties): AppMenuButton, new(config?: Gtk.Buildable.ConstructorProperties): AppMenuButton, new(config?: Gtk.ConstraintTarget.ConstructorProperties): AppMenuButton, new(config?: Gtk.Widget.ConstructorProperties): AppMenuButton, get_default_direction(): Gtk.TextDirection, set_default_direction(dir: Gtk.TextDirection): void, new(config?: Gtk.Actionable.ConstructorProperties): AppMenuButton, prototype: AppMenuButton}}
 */
class AppMenuButton extends PanelMenu.Button {
  static { GObject.registerClass(this) }

  _settings;

  _timerId = null

  _init() {
    super._init(MenuAlignment.Center, _('Thunderbird Mail Client'));

    this._settings = ExtensionUtils.getSettings();

    let box = new St.BoxLayout({ style_class: 'panel-status-menu-box thunderbird-menu-box' });
    box.add_child(TrayIconInstance);

    this.add_child(box);

    // Define menu items
    const menuItemCssClass = { style_class: 'thunderbird-menu-item' }

    // Create inbox menu item
    const menuOpenInboxIcon = Gio.icon_new_for_string(Me.path + '/icons/menu-icon-box.svg');
    const menuOpenInbox = new PopupMenu.PopupImageMenuItem(_('Open Inbox'), menuOpenInboxIcon, menuItemCssClass);
    menuOpenInbox.connect('activate', () => {
      try {
        Gio.Subprocess.new(['thunderbird', '-mail'], Gio.SubprocessFlags.STDERR_SILENCE);
      } catch (e) {
        Logger.error(e.message);
      }
    });

    const menuNewMessageIcon = Gio.icon_new_for_string(Me.path + '/icons/menu-icon-new-message.svg');
    const menuNewMessage = new PopupMenu.PopupImageMenuItem(_('New Message'), menuNewMessageIcon, menuItemCssClass);
    menuNewMessage.connect('activate', () => {
      try {
        Gio.Subprocess.new(['thunderbird', '-compose'], Gio.SubprocessFlags.STDERR_SILENCE);
      } catch (e) {
        Logger.error(e.message);
      }
    });

    const menuContactsIcon = Gio.icon_new_for_string(Me.path + '/icons/menu-icon-contacts.svg');
    const menuContacts = new PopupMenu.PopupImageMenuItem(_('Contacts'), menuContactsIcon, menuItemCssClass);
    menuContacts.connect('activate', () => {
      try {
        Gio.Subprocess.new(['thunderbird', '-addressbook'], Gio.SubprocessFlags.STDERR_SILENCE);
      } catch (e) {
        Logger.error(e.message);
      }
    });

    const menuProfileManagerIcon = Gio.icon_new_for_string(Me.path + '/icons/menu-icon-profile.svg');
    let menuProfileManager = new PopupMenu.PopupImageMenuItem(_('Profile Manager'), menuProfileManagerIcon, menuItemCssClass);
    menuProfileManager.connect('activate', () => {
      try {
        Gio.Subprocess.new(['thunderbird', '--ProfileManager'], Gio.SubprocessFlags.STDERR_SILENCE);
      } catch (e) {
        Logger.error(e.message);
      }
    });


    this.menu.addMenuItem(menuOpenInbox);
    this.menu.addMenuItem(menuNewMessage);
    this.menu.addMenuItem(menuContacts);
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this.menu.addMenuItem(menuProfileManager);

    // Subscribe to change interval
    this._settings.connect(`changed::refresh-interval`, this._startUpdater.bind(this));
    this._settings.connect(`changed::imap-accounts`, this._startUpdater.bind(this));
    this._startUpdater();
  }

  /**
   *
   * @private
   */
  _startUpdater() {
    this._stopUpdater();

    const self = this;

    const interval = this._settings.get_int('refresh-interval');
    const configs =  this._settings.get_strv('imap-accounts');

    Logger.debug(`Run updater with interval ${interval}`)

    this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
      self._updateMessages(configs);
      return GLib.SOURCE_CONTINUE;
    });

    self._updateMessages(configs);
  }

  _stopUpdater() {
    if (this._timerId) {
      GLib.Source.remove(this._timerId);
      this._timerId = null;
    }
  }

  _updateMessages(configs) {
    getMessagesCount(configs, output => {
      Logger.debug(`output ${output}`);
    });
    // TrayIconInstance.setMessagesCount();
  }

  destroy(){
    super.destroy();

    this._stopUpdater();
  }
}

class ThunderbirdNotificationExtension {
  _menu = null;

  constructor(uuid) {
    this._uuid = uuid;
  }

  enable() {
    Logger.info('Enabled');

    // Add tray icon
    TrayIconInstance = new TrayIconWidget();

    this._menu = new AppMenuButton();

    Main.panel.addToStatusArea(this._uuid, this._menu, 0, 'right');
  }

  disable() {
    Logger.warn('Disabled');
    Logger = null;

    this._menu.destroy();
    this._menu = null;

    TrayIconInstance.destroy();
    TrayIconInstance = null;
  }
}

/**
 * Extension initialization
 * @param meta {ExtensionMetadata}
 * @returns {ThunderbirdNotificationExtension}
 */
function init(meta) {
  ExtensionUtils.initTranslations(Me.metadata['gettext-domain']);
  return new ThunderbirdNotificationExtension(meta.uuid);
}


