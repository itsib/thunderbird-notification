const { GObject, Gtk, Gio, Adw } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const _ = ExtensionUtils.gettext;

/** @type {Logger} */
const Logger = new Me.imports.modules.logger.Logger(Me.metadata['gettext-domain']);

const FIELD_NAME_REFRESH_INTERVAL = 'refresh-interval';

var RefreshIntervalControl = class CommonPreferencesGroup extends Adw.PreferencesGroup {
  static { GObject.registerClass(this) }

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

    const spinButton = new Gtk.SpinButton({
      value: settings.get_int(FIELD_NAME_REFRESH_INTERVAL),
      valign: Gtk.Align.CENTER,
    });

    spinButton.set_sensitive(true);
    spinButton.set_range(30, 240);
    spinButton.set_increments(5, 2);
    spinButton.set_value(settings.get_int(FIELD_NAME_REFRESH_INTERVAL));
    spinButton.connect('value-changed', btn => {
      const amount = btn.get_value_as_int();

      Logger.debug(`Update ${FIELD_NAME_REFRESH_INTERVAL}: ${amount}`);

      settings.set_int(FIELD_NAME_REFRESH_INTERVAL, amount);
    });

    actionRow.add_suffix(spinButton);
    actionRow.activatable_widget = spinButton;

    this.add(actionRow);
  }
}