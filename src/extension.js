const { GObject, St, Gio, Atk, GLib } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Me = ExtensionUtils.getCurrentExtension();
const Modules = Me.imports.modules;
const { MenuAlignment, StoreKey } = Me.imports.modules.utils;
const { messages } = Me.imports.modules.process;
/** @type {Logger} */
const { Logger } = Me.imports.modules.logger;

const _ = ExtensionUtils.gettext;

/**
 * @type {TrayIconWidget}
 */
let TrayIconInstance;

let timerId = null

function stopUpdater() {
  if (timerId) {
    GLib.Source.remove(timerId);
    timerId = null;
  }
}

function startUpdater(interval, configs) {
  Logger.debug(`Start updater with interval ${interval}`)

  stopUpdater();

  const update = () => {
    Logger.debug('Update start');

    Promise.all(configs.map(config => messages(config))).then(results => {
      const totalUnread = results.reduce((t, v) => t + v, 0);
      Logger.debug(`Update result ${totalUnread} unread`);

      if (TrayIconInstance) {
        TrayIconInstance.setMessagesCount(totalUnread);
      }
    });
  };

  timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
    update();
    return GLib.SOURCE_CONTINUE;
  });

  update();
}

class TrayIconWidget extends St.Icon {
  static { GObject.registerClass(this) }

  /** @type {Gio.Icon[]} */
  _iconsSet;

  constructor() {
    const iconsSet = [
      Gio.icon_new_for_string(Me.path + '/icons/tray-icon-messages-0.svg'),
      Gio.icon_new_for_string(Me.path + '/icons/tray-icon-messages-1.svg'),
      Gio.icon_new_for_string(Me.path + '/icons/tray-icon-messages-2.svg'),
      Gio.icon_new_for_string(Me.path + '/icons/tray-icon-messages-3.svg'),
      Gio.icon_new_for_string(Me.path + '/icons/tray-icon-messages-4.svg'),
      Gio.icon_new_for_string(Me.path + '/icons/tray-icon-messages-5.svg'),
      Gio.icon_new_for_string(Me.path + '/icons/tray-icon-messages-6.svg'),
      Gio.icon_new_for_string(Me.path + '/icons/tray-icon-messages-7.svg'),
      Gio.icon_new_for_string(Me.path + '/icons/tray-icon-messages-8.svg'),
      Gio.icon_new_for_string(Me.path + '/icons/tray-icon-messages-9.svg'),
      Gio.icon_new_for_string(Me.path + '/icons/tray-icon-messages-10.svg'),
    ];

    super({ gicon: iconsSet[0], style_class: 'system-status-icon' });

    this._iconsSet = iconsSet;
  }

  /**
   * Update messages count in tray
   * @param count {number}
   */
  setMessagesCount(count = 0) {
    const index = count <= 0 ? 0 : count >= 10 ? 10 : count;

    this.gicon = this._iconsSet[index];
  }

  destroy() {
    super.destroy();
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

  _init() {
    super._init(MenuAlignment.Center, _('Email Client'));

    let box = new St.BoxLayout({ style_class: 'panel-status-menu-box email-menu-box' });
    box.add_child(TrayIconInstance);

    this.add_child(box);

    // Define menu items
    const menuItemCssClass = { style_class: 'email-menu-item' }

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

    const settings = ExtensionUtils.getSettings();

    const restartUpdater = () => {
      const interval = settings.get_int(StoreKey.RefreshInterval);
      const configs =  settings.get_strv(StoreKey.ImapSettings);

      startUpdater(interval, configs);
    };

    // Subscribe to change interval
    settings.connect(`changed::${StoreKey.RefreshInterval}`, () => restartUpdater());
    settings.connect(`changed::${StoreKey.ImapSettings}`, () => restartUpdater());
    restartUpdater();
  }

  destroy(){
    stopUpdater();
    super.destroy();
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

    this._menu.destroy();
    this._menu = null;

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


