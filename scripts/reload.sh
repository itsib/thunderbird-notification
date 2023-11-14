#!/bin/bash

gnome-extensions disable thunderbird-notification@itsib.github.com

gnome-extensions uninstall thunderbird-notification@itsib.github.com

npm run build

gnome-extensions install thunderbird-notification@itsib.github.com.zip --force

killall -3 gnome-shell