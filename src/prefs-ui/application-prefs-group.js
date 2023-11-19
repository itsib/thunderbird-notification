const { GObject, Gtk, Gio, Adw } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const _ = ExtensionUtils.gettext;

/** @type {Logger} */
const { Logger } = Me.imports.modules.logger;
const { StoreKey } = Me.imports.modules.utils;

var ApplicationPrefsGroup = class ApplicationPrefsGroup extends Adw.PreferencesGroup {
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

    Logger.debug(`Current Refresh interval ${settings.get_int(StoreKey.RefreshInterval)}, Log Level ${settings.get_int(StoreKey.LogLevel)}`);

    this._buildRefreshIntervalControl(settings);
    this._buildLogLevelControl(settings);
  }

  _buildRefreshIntervalControl(settings) {
    const actionRow = new Adw.ActionRow({
      title: _('Refresh time (seconds)'),
      subtitle: _('After what period of time will emails be updated over the IMAP protocol.'),
    });

    const spinButton = new Gtk.SpinButton({
      value: settings.get_int(StoreKey.RefreshInterval),
      valign: Gtk.Align.CENTER,
    });

    spinButton.width_chars = 6;
    spinButton.set_sensitive(true);
    spinButton.set_range(30, 86400);
    spinButton.set_increments(5, 2);
    spinButton.set_value(settings.get_int(StoreKey.RefreshInterval));
    spinButton.connect('value-changed', btn => {
      const amount = btn.get_value_as_int();
      Logger.debug(`Refresh Interval changed to ${amount}`);
      settings.set_int(StoreKey.RefreshInterval, amount);
    });

    actionRow.add_suffix(spinButton);
    actionRow.activatable_widget = spinButton;

    this.add(actionRow);
  }

  _buildLogLevelControl(settings) {
    const actionRow = new Adw.ActionRow({
      title: _('Log Level'),
      subtitle: _('Which messages will be displayed in the log. If you select "Info", Error, Warning and Info will be visible.'),
    });

    const store = new Gtk.ListStore();
    store.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);
    store.set(store.append(), [0, 1], ['0', _('Disabled')]);
    store.set(store.append(), [0, 1], ['1', _('Debug')]);
    store.set(store.append(), [0, 1], ['2', _('Info')]);
    store.set(store.append(), [0, 1], ['3', _('Warn')]);
    store.set(store.append(), [0, 1], ['4', _('Error')]);

    // active_id: settings.get_int(StoreKey.LogLevel)
    const comboBox = new Gtk.ComboBox({ model: store });
    const renderer = new Gtk.CellRendererText();
    renderer.weight = 400;
    comboBox.pack_start(renderer, false);
    comboBox.add_attribute(renderer, "text", 1);
    comboBox.set_id_column(0);
    comboBox.set_entry_text_column(1);
    comboBox.set_active(0);
    comboBox.width_request = 125;

    comboBox.connect('changed', self => Logger.debug(`Log Level Changed to ${self.active}`));

    settings.bind(StoreKey.LogLevel, comboBox, 'active', Gio.SettingsBindFlags.DEFAULT);

    const box = new Gtk.Box({ spacing: 0 });
    box.width_request = 125;
    box.height_request = 20;
    box.margin_top = 16;
    box.margin_bottom = 16;
    box.append(comboBox);

    actionRow.add_suffix(box);
    actionRow.activatable_widget = box;

    this.add(actionRow);
  }
}