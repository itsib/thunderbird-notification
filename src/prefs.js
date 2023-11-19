const { GObject, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/** @type {Logger} */
const { Logger } = Me.imports.modules.logger;
const { ApplicationPrefsGroup } = Me.imports['prefs-ui']['application-prefs-group'];
const { ImapConfigsPrefsGroup } = Me.imports['prefs-ui']['imap-configs-prefs-group'];

const _ = ExtensionUtils.gettext;

class PreferencesWidget extends Gtk.Box {
    static {
        GObject.registerClass(this);
    }

    _init() {
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 20,
        });

        this.append(new ApplicationPrefsGroup());
        this.append(new ImapConfigsPrefsGroup());
    }
}

/**
 * Like `extension.js` this is used for any one-time setup like translations.
 *
 * @param meta {ExtensionMetadata} The metadata.json file, parsed as JSON
 */
function init(meta) {
    new Promise((resolve, reject) => {});
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