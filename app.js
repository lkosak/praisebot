var xmpp = require('node-xmpp');
var http = require('http');
var HttpClient = require('scoped-http-client');
var config = require('./config');
var User = require('./user');

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
  var body = stanza.getChildText('body').toLowerCase();
  var user = getUser(stanza.attrs.from);

  if(body.indexOf('thanks') !== -1) {
    var replies = [
      "Any time, {first_name}!",
      "You got it, {first_name}.",
      "I wouldn't say it to anyone else.",
      "I only said it because you're so handsome, {first_name}.",
      "Just remember me when the holidays come around, {first_name}.",
      "Shucks, it weren't nothin'.",
      "You're a total sweety, {first_name}.",
      "Back at ya, {first_name}.",
      "Here's looking at you, {first_name}."
    ];
  } else if(body.indexOf('sounds good') !== -1) {
    var replies = [
      "Awesome. Let's make it happen.",
      "You bet it does.",
      "Yup!",
      "Over and out."
    ];
  } else {
    var replies = [
      "That's wonderful to hear, {at_name}!",
      "Smashing good show, {first_name}!",
      "Oh, you're the bee's knees, mister {last_name}!",
      "I'd like to take you on a nice trip up to the Catskills, {at_name}!",
      "You're like an exploding star, {at_name}! Ever burning brighter...",
      "I'd like to introduce you to my parents, {at_name}!",
      "Want to go on a fishing trip with me, {at_name}?",
      "Let's elope to Istanbul, {at_name}!",
      "With that kind of great work, you'll make middle management in no time!",
      "I'll bake you a very nice little cake for that one, {at_name}!",
      "Ooooh your such a special little guy, {first_name}. I'll take you out to the movies and buy you a hamburger.",
      "Listen, {first_name} -- if you were a girl, I'd do ya.",
      "Take it from me, {at_name} -- you're never going to get away with that kind of talk.",
      "Mum mum mum mummmmm",
      "Did I already ask you about a fishing trip, {first_name}?",
      "I'm serious about that fishing trip, {first_name}.",
      "Fuck it. Let's buy a vacation home and really seal the deal.",
      "I'm not going to tell you what that makes me think of, {first_name}.",
      "When have I EVER asked you to do anything for me? Seriously, {at_name}...",
      "I'm a pretty useful little praisebot, aren't I, {first_name}?",
      "I'm ready for my closeup now, mister {last_name}.",
      "I'm not actually ready for that closeup. I changed my robot mind.",
      "You ever wonder what's inside my little metal head? Brains.",
      "Ho hum humbidy dum.",
      "Want to go fission, {first_name}? There's a great reactor near here. Teehee.",
      "That's all for now, freaksauce."
    ];
  }

  var reply = replies[Math.floor(Math.random()*replies.length)];

  reply = reply.replace(/{(.*?)}/, function(match, text, attr) {
    if(typeof user[text] === "function") {
      return user[text]();
    } else {
      return text;
    }
  });

  return reply;
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
  if(process.env.ROOMS) {
    var nodes = process.env.ROOMS.split(",");

    for(var i=0; i<nodes.length; i++) {
      joinRoom(nodes[i]);
    }
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
setInterval(function() {
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
