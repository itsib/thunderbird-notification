#!/bin/env bash

# Count unread mails in Thunderbird and write to stdout.

# Path to your Thunderbird profile.
PROFILE="sergey"

IMAP_PATH="$HOME/.thunderbird/$PROFILE/ImapMail/**/INBOX.msf"

for inbox in $IMAP_PATH; do
    [ -e "$inbox" ] || continue

    index=$(grep -Eo "\(([0-9]+)=unreadChildren)" "$inbox" | grep -Eo "[0-9]+" | tail -1)
    echo $(grep -Eo '\(\^93=[0-9]+)' "$inbox" | cat | awk -F '=' -- '{ printf "%s", substr($2, 0, length($2)-1) }')

#    MailServices.newMailNotification.messageCount

    regex="\(\^$index=([0-9]+)"
    echo "$index"
    echo "$inbox"
done

# Regex to find the unread message lines.
# Adding "9F" in front of regex works for ImapMail, but not for pop3. in Mail.
#REGEX='\(\^A2=([0-9]+)'
#
#count_unread_messages() {
#    local count=0
#    local result
#    local index
#
#    index=$(grep -Eo "\(([0-9]+)=unreadChildren)" "$1" | grep -Eo "[0-9]+" | tail -1)
#    echo "$index"
#
#    result=$(grep -Eo "$REGEX" "$1" | tail -1)
#    if [[ $result =~ $REGEX ]]
#    then
#        count="${BASH_REMATCH[1]}"
#        UNREAD_MAIL_COUNT=$(($UNREAD_MAIL_COUNT + $count))
#    fi
#    return "$count"
#}
#
#UNREAD_MAIL_COUNT=0

# Either use smart mailboxes or the Mail and ImapMail inboxes directly. Smart
# mailboxes are those specifically selected and enabled from within
# Thunderbird's inbox folder (right mouse click on inbox). Therefore don't
# enable SMART MAILBOXES and those in MAILBOXES at the same time.

# SMART MAILBOXES

# Includes all grouped mail specified in the right mouse menu on inbox folder.
#for inbox in "$PROFILE/Mail/smart mailboxes/Inbox.msf"
#do
#    count_unread_messages "$inbox"
#done

# MAILBOXES

# for inbox in $profile/ImapMail/*/INBOX.msf
# do
#     count_unreadmails "$inbox"
# done

# for inbox in $profile/Mail/pop3.*/Inbox.msf
# do
#     count_unreadmails "$inbox"
# done

# OUTPUT

# Use `echo -n` if no newline should be added.
#echo -n "$UNREAD_MAIL_COUNT"
