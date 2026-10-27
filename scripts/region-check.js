(function () {
  function block(why) {
    var d = document.createElement("div");
    d.className = "region-block";
    d.textContent =
      window.i18n.t("该内容在你所在的地区不可用") +
      (why ? "\n[" + why + "]" : "");
    document.documentElement.appendChild(d);
    try {
      window.stop();
    } catch (e) {}
  }
  var s = document.createElement("style");
  s.textContent = "html{visibility:hidden}";
  document.head.appendChild(s);
  var t = setTimeout(function () {
    block("timeout");
  }, 8000);
  var tr = function (r) {
    return r.text().then(function (x) {
      return (x.match(/loc=(\w+)/) || [])[1];
    });
  };
  var apis = [
    ["/cdn-cgi/trace", tr],
    [
      "https://api.country.is",
      function (r) {
        return r.json().then(function (j) {
          return j.country;
        });
      },
    ],
    [
      "https://ipapi.co/json/",
      function (r) {
        return r.json().then(function (j) {
          return j.country_code;
        });
      },
    ],
    ["https://www.cloudflare.com/cdn-cgi/trace", tr],
  ];
  (function next(i, errs) {
    if (i >= apis.length) {
      clearTimeout(t);
      return block("error" + errs);
    }
    fetch(apis[i][0])
      .then(apis[i][1])
      .then(function (c) {
        if (!c) throw "empty";
        clearTimeout(t);
        if (c === "CN") block("CN");
        else s.remove();
      })
      .catch(function (e) {
        next(i + 1, errs + " " + i + ":" + e);
      });
  })(0, "");
})();
