function process(event) {
  var detector = new DeviceDetector;
  var userAgent = event.useragent();
  var detected_useragent = detector.detect(userAgent);
  return [ { schema: "iglu:com.hometogo/derived-useragent/jsonschema/1-0-0",
    data:  { useragent: detected_useragent } } ];
}

function getFileIntoJSON(path) {
  var reader = new java.io.FileReader(path);
  var sb = new java.lang.StringBuilder;
  while ((c = reader.read()) != -1) { 
    sb.append(String.fromCharCode(c));
  };

  if (reader != null) {
    reader.close();
  };

  return JSON.parse(sb);
}

var mergeJSON = function() {
  var result = {};
  for (var i=0; i<arguments.length; i++) for(var key in arguments[i]) result[key] = arguments[i][key];
  return result;
}

function getBaseRegExp(str) {
  str = str.replace(new RegExp('/', 'g'), '\\/');
  str = str.replace(new RegExp('\\+\\+', 'g'), '+');
  str = '(?:^|[^A-Z0-9\-_]|[^A-Z0-9\-]_|sprd-)(?:' + str + ')';
  return new RegExp(str, 'i');
}

function DeviceDetector(options) {
  this.app_collection = [];
  this.browser_collection = [];
  this.os_collection = [];
  this.os_systems = [];
  this.os_families = [];
  this.os_collection = [];
  this.device_collection = [];

  this.init();
}

DeviceDetector.prototype.init = function () {
  var dir = '/snowplow/config/enrichments/data';
  this.app_collection = getFileIntoJSON(dir + '/mobile_apps.json');
  this.browser_collection = getFileIntoJSON(dir + '/browsers.json');
  this.os_collection = getFileIntoJSON(dir + '/oss.json');
  this.os_families = getFileIntoJSON(dir + '/os_families.json');
  this.os_systems = getFileIntoJSON(dir + '/os_systems.json');
  this.device_collection = mergeJSON(getFileIntoJSON(dir + '/devices/cameras.json'), getFileIntoJSON(dir + '/devices/car_browsers.json'), getFileIntoJSON(dir + '/devices/consoles.json'), getFileIntoJSON(dir + '/devices/media_players.json'), getFileIntoJSON(dir + '/devices/mobiles.json'), getFileIntoJSON(dir + '/devices/televisions.json'));
};

DeviceDetector.prototype.fixStringName = function (result) {
  return result.replace(new RegExp('_', 'g'), ' ').replace(/ TD$/i, '');
};

DeviceDetector.prototype.fixStringVersion = function (result) {
  return result.replace(new RegExp('_', 'g'), '.').trim();
};

DeviceDetector.prototype.buildVersion = function (version, matches) {
  return this.fixStringVersion(this.buildByMatch(version, matches));
};

DeviceDetector.prototype.buildModel = function (model, matches) {
  model = this.fixStringName(this.buildByMatch(model, matches));
  return (model === 'Build') ? null : model;
};

DeviceDetector.prototype.buildByMatch = function (item, matches) {
  item = item.toString();
  if (item.indexOf('$') !== -1) {
    for (var nb = 1; nb <= 3; nb++) {
      if (item.indexOf('$' + nb) === -1) {
        continue;
      };
      var replace = (matches[nb] !== undefined) ? matches[nb] : '';
      item = item.replace('$' + nb, replace);
    };
  };
  return item;
};

DeviceDetector.prototype.findDevice = function (userAgent) {


  for (var brand in this.device_collection) {

    var match = getBaseRegExp(this.device_collection[brand]['regex']).exec(userAgent);
    var deviceType = this.device_collection[brand]['device'];
    var model = '';

    if (match) {
      if (this.device_collection[brand]['models'] !== undefined) {
        var models = this.device_collection[brand]['models'];
        for (var i = 0, l = models.length; i < l; i++) {
          var data = models[i];
          var modelMatch = getBaseRegExp(data.regex).exec(userAgent);
          if (modelMatch) {
            model = this.buildModel(data.model, modelMatch);
            if (data.device !== undefined) {
              deviceType = data.device;
            };
            break;
          };
        };
      } else if (this.device_collection[brand]['model'] !== undefined) {
        model = this.buildModel(this.device_collection[brand]['model'], match);
      };
      return {
        brand: String(brand).trim(),
        model: String(model).trim(),
        type: deviceType
      };
    };
  };
  return null;
};

DeviceDetector.prototype.findApp = function (userAgent) {
  for (var i = 0, l = this.app_collection.length; i < l; i++) {
    var item = this.app_collection[i];
    var regex = getBaseRegExp(item.regex);
    var match;
    if (match = regex.exec(userAgent)) {
      return {
        name: this.buildByMatch(item.name, match),
        version: this.buildVersion(item.version, match),
        type: 'mobile app'
      };
    };
  };
  return {};
};


DeviceDetector.prototype.findBrowser = function (user_agent) {
  for (var i = 0, l = this.browser_collection.length; i < l; i++) {
    var item = this.browser_collection[i];
    var regex = getBaseRegExp(item.regex);
    var match;
    if (match = regex.exec(user_agent)) {
      return {
        name: this.buildByMatch(item.name, match),
        version: this.buildVersion(item.version, match),
        type: 'browser'
      };
    };
  };
  return null;
};


/**
 * @param userAgent
 * @return {{name: string, version: string, platform: string, short_name: string}}|null
 */
DeviceDetector.prototype.findOs = function (userAgent) {
  for (var i = 0, l = this.os_collection.length; i < l; i++) {
    var item = this.os_collection[i];
    var regex = getBaseRegExp(item.regex);
    var match;
    if (match = regex.exec(userAgent)) {

      var name = this.buildByMatch(item.name, match);
      var short = 'UNK';

      for(var key in this.os_systems){
        if (String(name).toLowerCase() === String(this.os_systems[key]).toLowerCase()) {
          name = this.os_systems[key];
          short = key;
          break;
        };
      };

      return {
        name: name,
        version: this.buildVersion(item.version, match),
        platform: this.findPlatform(userAgent),
        short_name: short
      };
    };
  };
  return null;
};

/**
 * @param userAgent
 * @return {*}
 */
DeviceDetector.prototype.findPlatform = function (userAgent) {
  if (/arm/i.test(userAgent)) {
    return 'ARM';
  } else if (/WOW64|x64|win64|amd64|x86_64/i.test(userAgent)) {
    return 'x64';
  } else if (/i[0-9]86|i86pc/i.test(userAgent)) {
    return 'x86';
  };
  return '';
};

DeviceDetector.prototype.detect = function (user_agent) {
  var osData = this.findOs(user_agent);
  var clientData = this.findApp(user_agent);
  var deviceData = this.findDevice(user_agent);
  var ret = {
    os: osData
  };

  if (clientData.name === undefined) {
    clientData = this.findBrowser(user_agent);
    ret.client = {
      name: clientData.name,
      version: clientData.version,
      type: clientData.type
    };
  };
  if (deviceData) {
    ret.device = {
      brand: deviceData.brand,
      model: deviceData.model,
      type: deviceData.type,
    };
  };

  return ret;
};

