const { GObject, St, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

var TrayIconWidget = class TrayIconWidget extends St.Icon {
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