var xmpp = require('node-xmpp');
var config = require('config');
var http = require('http');
var HttpClient = require('scoped-http-client');
var User = require('user');

var client = new xmpp.Client({ jid: config.jid, password: config.password });

client.on('online', function() {
  console.log('Connected. Sending presence');

  var presence = new xmpp.Element('presence', {}).
    c('show').t('chat').up().
    c('status').t('Having a great day');

  client.send(presence);

  joinRooms();
});

client.on('error', function(e) {
  console.error(e);
});

client.on('stanza', function(stanza) {
  if(stanza.is('message')) {
    if(stanza.attrs.type === 'error') return;
    if(isOldMessage(stanza)) return;

    var body = stanza.getChildText('body');

    if(talkingToMe(stanza)) {
      var reply = makeReply(stanza);

      if(reply) {
        var msg = new xmpp.Element('message', {
          to: stanza.attrs.from, type: stanza.attrs.type
        }).c('body').t(reply);

        client.send(msg);
      }
    }
  }
});

function isOldMessage(stanza) {
  return stanza.getChild('delay') !== undefined;
}

function talkingToMe(stanza) {
  if(stanza.getChildText('body') === null) return false;

  var bare_jid = config.jid.split('/')[0];

  if(stanza.attrs.from.indexOf(config.muc_host) === -1
     && stanza.attrs.to.indexOf(bare_jid) !== -1) {
    return false; // don't respond to PMs. They confuse poor praisebot
  }

  var body = stanza.getChildText('body').toLowerCase();

  for(var i=0; i<config.responds_to.length; i++) {
    if(body.indexOf(config.responds_to[i].toLowerCase()) !== -1) {
      return true;
    }
  }

  return false;
}

function makeReply(stanza) {
  var user = getUser(stanza.attrs.from);

  var replies = [
    "That's wonderful to hear, "+user.at_name()+"!",
    "Smashing good show, "+user.first_name()+"!",
    "Oh, you're the bees' knees, mister "+user.last_name()+"!",
    "I'd like to take you on a nice trip up to the Catskills, "+user.at_name()+"!",
    "You're like an exploding star, "+user.at_name()+"! Ever burning brighter...",
    "I'd like to introduce you to my parents, "+user.at_name()+"!",
    "Want to go on a fishing trip with me, "+user.at_name()+"?",
    "Lets' elope to Istanbul, "+user.at_name()+"!",
    "With that kind of great work, you'll make middle management in no time!"
  ];

  return replies[Math.floor(Math.random()*replies.length)];
}

function getUser(jid) {
  if(jid.indexOf(config.muc_host) !== -1) {
    var name = jid.split("/")[1];
    return new User({ name: name });
  }
}

process.on('SIGINT', function () {
  console.log('Disconnecting...');
  client.end();
});

client.on('offline', function() {
  console.log('disconnected');
  process.exit(0);
});

function joinRooms() {
  for(var i=0; i<config.muc_rooms.length; i++) {
    joinRoom(config.muc_rooms[i]);
  }
}

function joinRoom(node) {
  console.log('Joining room: ' + node);

  var presence = new xmpp.Element('presence', {
    from: config.jid,
    to: node+'@'+config.muc_host+'/'+config.muc_nick
  }).c('x', { xmlns: 'http://jabber.org/protocol/muc' });

  client.send(presence, function(r) {
    console.log(r);
  });
}

// keepalive
setTimeout(function() {
  console.log('sending keepalive');
  client.send(' ');
}, config.keepalive_interval);


var herokuUrl = process.env.HEROKU_URL;
if(herokuUrl) {
  if(!/\/$/.test(herokuUrl)) { herokuUrl += '/'; }

  setInterval(function() {
    HttpClient.create(herokuUrl+"ping").post()(function(err, res, body) {
      console.log('heroku keepalive ping');
    });
  }, 1200000);

  http.createServer(function(req, res) {
    res.writeHead(200, ['Content-Type', 'text/plain']);
    res.write('PONG');
    res.end();
  }).listen(process.env.PORT || 8080);

  console.log('Initialized ping server');
}
