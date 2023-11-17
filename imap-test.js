const Imap = require('imap');
//
const connection = new Imap({
  // user: 'itsib.su',
  // password: 'vjjyrlywslptknid',
  // host: 'imap.yandex.com',
  // port: 993,
  // tls: true,

  user: 'itsib.su@gmail.com',
  password: 'yexzfszsmcpevpkt',
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: {servername: 'imap.gmail.com'},
  autotls: 'always'
});

connection.once('error', function (err) {
  console.log('Source Server Error:- ', err);
})

connection.once('ready', function () {
  connection.openBox('INBOX', true, function (err, box) {
    if (err) {
      throw err;
    }
    console.log(box);
  });

  // mail operation
  //getMailBoxLabels(mailServer1);
  // getEmailFromInbox(mailServer1)
  //createLabel(mailServer1, "demo-label1");
  //deleteLabel(mailServer1, "demo-label1");
  //getMailboxStatusByName(mailServer1, "INBOX");
});

connection.once('end', function() {
  console.log('Connection ended');
});

connection.connect();