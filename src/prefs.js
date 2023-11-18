const { Adw, GObject, Gtk, Gio, GLib, Pango } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Modules = Me.imports.modules;

const { RefreshIntervalControl } = Me.imports.widgets['refresh-interval-control'];
const { ImapConfigsListWidget } = Me.imports.widgets['imap-configs-list-widget'];

const _ = ExtensionUtils.gettext;

/** @type {Logger} */
const Logger = new Modules.logger.Logger(Me.metadata['gettext-domain']);

class PreferencesWidget extends Gtk.Box {
    static {
        GObject.registerClass(this);
    }

    _init() {
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 20,
        });

        this.append(new RefreshIntervalControl());
        this.append(new ImapConfigsListWidget());
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