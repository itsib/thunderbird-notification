const { GObject, St, Gio, Atk } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Me = ExtensionUtils.getCurrentExtension();
const Modules = Me.imports.modules;
const MenuAlignment = Modules.utils.MenuAlignment;

const _ = ExtensionUtils.gettext;

/** @type {Logger} */
let Logger;
/**
 * @type {TrayIcon}
 */
let TrayIconInstance;

// Extend tray icon to change state
const TrayIcon = GObject.registerClass(
class TrayIcon extends St.Icon {

  _states;

  constructor() {
    const online = Gio.icon_new_for_string(Me.path + '/icons/icon-thunderbird.svg');
    const offline = Gio.icon_new_for_string(Me.path + '/icons/icon-thunderbird.svg');
    const message = Gio.icon_new_for_string(Me.path + '/icons/icon-thunderbird.svg');

    super({ gicon: online, style_class: 'system-status-icon' });

    this._states = { online, offline, message };
  }

  setState(state) {
    this.gicon = this._states[state];
  }

  destroy() {
    super.destroy();
    this._states.online = null;
    this._states.offline = null;
    this._states.message = null;
  }
});

/**
 * Dropdown menu integrated in tray icon.
 * @link https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/panel.js
 *
 * @type {{new(): AppMenuButton, style_class: string, name: string, $gtype: GObject.GType<Atk.ImplementorIface>, new(config?: Atk.ImplementorIface.ConstructorProperties): AppMenuButton, new(config?: Clutter.Animatable.ConstructorProperties): AppMenuButton, new(config?: Animatable.ConstructorProperties): AppMenuButton, new(config?: Clutter.Container.ConstructorProperties): AppMenuButton, class_find_child_property: {(klass: ObjectClass, property_name: (string | null)): ParamSpec, (klass: ObjectClass, property_name: (string | null)): ParamSpec}, class_list_child_properties: {(klass: ObjectClass): ParamSpec[], (klass: ObjectClass): ParamSpec[]}, new(config?: Container.ConstructorProperties): AppMenuButton, new(config?: Clutter.Scriptable.ConstructorProperties): AppMenuButton, new(config?: Scriptable.ConstructorProperties): AppMenuButton, new(config?: St.Button.ConstructorProperties): AppMenuButton, new(): AppMenuButton, new: {(): St.Button, (): St.Bin, (): Clutter.Actor, (): St.Bin, (): Clutter.Actor, (): Clutter.Actor, (): Actor, (): Gtk.Button}, new_with_label: {(text: (string | null)): St.Button, (label: (string | null)): Gtk.Button}, new(config?: St.Bin.ConstructorProperties): AppMenuButton, new(): AppMenuButton, new(config?: St.Widget.ConstructorProperties): AppMenuButton, new(config?: Clutter.Actor.ConstructorProperties): AppMenuButton, new(): AppMenuButton, new(config?: InitiallyUnowned.ConstructorProperties): AppMenuButton, new(config?: GObject.InitiallyUnowned.ConstructorProperties): AppMenuButton, new(config?: Actor.ConstructorProperties): AppMenuButton, new(): AppMenuButton, new(config?: Gtk.Button.ConstructorProperties): AppMenuButton, new(): AppMenuButton, new_from_icon_name(icon_name: (string | null)): Gtk.Button, new_with_mnemonic(label: (string | null)): Gtk.Button, new(config?: Gtk.Accessible.ConstructorProperties): AppMenuButton, new(config?: Gtk.Buildable.ConstructorProperties): AppMenuButton, new(config?: Gtk.ConstraintTarget.ConstructorProperties): AppMenuButton, new(config?: Gtk.Widget.ConstructorProperties): AppMenuButton, get_default_direction(): Gtk.TextDirection, set_default_direction(dir: Gtk.TextDirection): void, new(config?: Gtk.Actionable.ConstructorProperties): AppMenuButton, prototype: AppMenuButton}}
 */
const AppMenuButton = GObject.registerClass(
class AppMenuButton extends PanelMenu.Button {

  constructor() {
    super(MenuAlignment.Center, _('Tailscale Connect Menu'));

    this.style_class += ' tailscale-tray-button'
  }

  _init() {
    super._init(MenuAlignment.Center, _('Thunderbird Mail Client'));

    // Add tray icon
    TrayIconInstance = new TrayIcon();
    let box = new St.BoxLayout({ style_class: 'panel-status-menu-box thunderbird-menu-box' });
    box.add_child(TrayIconInstance);

    this.add_child(box);

    this.get_child_at_index(0)

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
  }

  destroy(){
    super.destroy();
    TrayIconInstance = null;
  }
});

class ThunderbirdNotificationExtension {
  _menu = null;

  constructor(uuid) {
    this._uuid = uuid;
  }

  enable() {
    Logger =  new Modules.logger.Logger(Me.metadata['gettext-domain']);

    this._menu = new AppMenuButton();

    Main.panel.addToStatusArea(this._uuid, this._menu, 0, 'right');

    Logger.info('Enabled');
  }

  disable() {
    Logger.warn('Disabled');

    this._menu.destroy();
    this._menu = null;

    Logger = null;
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


