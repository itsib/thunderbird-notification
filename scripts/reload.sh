#!/bin/bash

gnome-extensions disable email-notification@itsib.github.com

gnome-extensions uninstall email-notification@itsib.github.com

npm run build

gnome-extensions install email-notification@itsib.github.com.zip --force

killall -3 gnome-shell