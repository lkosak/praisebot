var cache = {};

var User = (function () {

  function User (attrs) {
    if(attrs.name && attrs.name in cache) {
      return cache[attrs.name];
    }

    for(var key in attrs) {
      this[key] = attrs[key];
    }

    cache[attrs.name] = this;
  }

  User.prototype.at_name = function() {
    return '@' + this.first_name().toLowerCase();
  };

  User.prototype.first_name = function() {
    return this.name.split(" ")[0];
  };

  User.prototype.last_name = function() {
    var tokens = this.name.split(" ");
    return tokens[tokens.length-1];
  };

  return User;

})();

module.exports = User;
